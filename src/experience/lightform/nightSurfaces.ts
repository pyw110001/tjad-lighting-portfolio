import * as THREE from 'three';
import type { NightSceneId } from './studioTypes';
import { mirroredHemisphereU, type MediaFit } from './mediaMapping';
import type { ColumnPreset } from './columnLighting';

export interface NativeNightScene {
  scene: THREE.Scene; ready?: Promise<void>; cameraPosition: THREE.Vector3; target: THREE.Vector3; fov?: number;
  update?: (time: number) => void; dispose?: () => void;
  lightingState?: { fill: number; breath: number };
  model?: { parts: Map<string, THREE.Group>; design?: { width: number; depth: number; lobbyHeight: number; height: number; lowHeight: number; leftHeight?: number; roofBackDrop?: number; cornerRadius: number } };
  material?: THREE.ShaderMaterial; materials?: THREE.ShaderMaterial[];
  displayMesh?: THREE.Mesh; displayGrid?: [number, number]; displayAspect?: number;
  cameraLimits?: { azimuth: number; polar: number; minDistance: number; maxDistance: number };
  setColumnPreset?: (preset: ColumnPreset) => void;
  resize?: (width: number, height: number) => void;
}
export type DisplaySurface = {
  mesh: THREE.Mesh; nativeGeometry: THREE.BufferGeometry; geometry: THREE.BufferGeometry;
  nativeMaterial: THREE.Material | THREE.Material[]; material: THREE.ShaderMaterial;
};
export type NightSurfaces = { surfaces: DisplaySurface[]; aspect: number; fit: MediaFit };

/** Keep upstream preview colors/animation while making the existing display controls live. */
function configureNativeLight(material: THREE.Material, id: NightSceneId) {
  if (!(material instanceof THREE.ShaderMaterial) || id === 'field') return;
  if (material.userData.authoredDisplay) return;
  material.uniforms.studioSize = { value: 1 }; material.uniforms.studioLed = { value: 1 };
  let shader = material.fragmentShader;
  if (id === 'dome') shader = shader.replace('float aperture=.26+.065*seed;', 'float aperture=(.26+.065*seed)*studioSize;')
    .replace('if(disk<.01)discard;', 'disk=mix(1.,disk,studioLed);if(disk<.01)discard;');
  if (id === 'fluid') shader = shader.replace('.23-aa,.23+aa', '.23*studioSize-aa,.23*studioSize+aa')
    .replace('float wave=', 'lamp=mix(1.,lamp,studioLed);float wave=');
  material.fragmentShader = 'uniform float studioSize,studioLed;\n' + shader;
  material.needsUpdate = true;
}

export function createMediaMaterial(columns: number, rows: number, column = false) {
  return new THREE.ShaderMaterial({
    side: THREE.FrontSide, uniforms: {
      uMedia: { value: null }, uScale: { value: new THREE.Vector2(1, 1) }, uOffset: { value: new THREE.Vector2() },
      uGrid: { value: new THREE.Vector2(columns, rows) }, uBrightness: { value: 1 }, uSize: { value: .55 },
      uLed: { value: 1 }, uGlow: { value: .58 }, uColumn: { value: column ? 1 : 0 },
    },
    vertexShader: `attribute float mediaMask; varying vec2 vUv; varying float vMask;
      void main(){vUv=uv;vMask=mediaMask;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D uMedia; uniform vec2 uScale,uOffset,uGrid;
      uniform float uBrightness,uSize,uLed,uGlow,uColumn; varying vec2 vUv; varying float vMask;
      vec3 sampleMedia(vec2 point){vec2 p=.5+(point-.5)*uScale-uOffset;
        if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,vec2(1.))))return vec3(0.);
        return texture2D(uMedia,vec2(p.x,1.-p.y)).rgb;}
      void main(){
        vec3 dark=vec3(.0015,.003,.006);
        if(vMask<.99){gl_FragColor=vec4(dark,1.);}else{
          vec2 cell=vUv*uGrid;vec2 samplePoint=(floor(cell)+.5)/uGrid;
          float r=length(fract(cell)-.5),aa=max(fwidth(r),.008);
          float radius=mix(.12,.43,uSize);float disk=1.-smoothstep(radius-aa,radius+aa,r);
          float footprint=max(length(dFdx(cell)),length(dFdy(cell)));
          disk=mix(disk,3.14159*radius*radius,smoothstep(.5,1.3,footprint));
          float halo=exp(-r*r/((radius+.08)*(radius+.08)))*uGlow*.14;
          vec3 signal=mix(sampleMedia(vUv),sampleMedia(samplePoint)*(disk+halo),uLed);
          if(uColumn>.5)signal=sampleMedia(vUv);
          gl_FragColor=vec4(dark+signal*uBrightness*1.45,1.);
        }
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function maskGeometry(geometry: THREE.BufferGeometry, mask?: number[]) {
  geometry.setAttribute('mediaMask', new THREE.Float32BufferAttribute(mask ?? Array(geometry.attributes.position.count).fill(1), 1));
  return geometry;
}

export function bindNightSurfaces(id: NightSceneId, native: NativeNightScene): NightSurfaces {
  const surfaces: DisplaySurface[] = [];
  const bind = (mesh: THREE.Mesh, geometry: THREE.BufferGeometry, material: THREE.ShaderMaterial) => {
    for (const original of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) configureNativeLight(original, id);
    surfaces.push({ mesh, nativeGeometry: mesh.geometry, nativeMaterial: mesh.material, geometry, material });
  };
  if (id === 'dome') {
    const mesh = native.model!.parts.get('dot-field')!.children.find(n => n instanceof THREE.Mesh) as THREE.Mesh;
    // Fold both hemispheres onto the same media domain. The rear reads as a mirror.
    const geometry = new THREE.SphereGeometry(10, 224, 92, 0, Math.PI * 2, 0, Math.PI / 2);
    geometry.rotateY(-Math.PI / 2);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) { uv.setX(i, mirroredHemisphereU(uv.getX(i))); uv.setY(i, 1 - uv.getY(i)); }
    bind(mesh, maskGeometry(geometry), createMediaMaterial(224, 92));
    return { surfaces, aspect: 2, fit: 'contain' };
  }
  if (id === 'fluid') {
    const mesh = native.displayMesh;
    if (!mesh?.geometry.attributes.uv) throw new Error('GLB 缺少 MEDIA_FACADE 或连续 UV。');
    const grid = native.displayGrid ?? [165, 30];
    bind(mesh, maskGeometry(mesh.geometry.clone()), createMediaMaterial(...grid));
    return { surfaces, aspect: native.displayAspect ?? 8, fit: 'stretch' };
  }
  // The plaza owns its light presets; it has no media or pointer surface.
  return { surfaces, aspect: 1, fit: 'contain' };
}
