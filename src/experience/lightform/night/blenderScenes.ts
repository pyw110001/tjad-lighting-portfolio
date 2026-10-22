import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createColumnLighting } from '../columnLighting';
import type { NativeNightScene } from '../nightSurfaces';

const MODEL_ROOT = '/assets/light-lab/night/models/';

function facadeMaterial(grid: [number, number]) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 1 }, studioSize: { value: 1 }, studioLed: { value: 1 }, uGrid: { value: new THREE.Vector2(...grid) } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv;uniform float uTime,uOn,studioSize,studioLed;uniform vec2 uGrid;
      void main(){vec2 cell=vUv*uGrid,q=fract(cell)-.5;float r=length(q),aa=max(fwidth(r),.008);
        float lamp=1.-smoothstep(.205*studioSize-aa,.205*studioSize+aa,r);
        float housing=1.-smoothstep(.42-aa,.42+aa,r);
        float wave=sin(floor(cell.x)*.11+floor(cell.y)*.28+uTime*.19)+.58*cos(floor(cell.x)*.19-floor(cell.y)*.24-uTime*.13);
        float intensity=mix(.012,2.8,smoothstep(-.2,.72,wave))*uOn;
        float footprint=max(length(dFdx(cell)),length(dFdy(cell)));
        lamp=mix(lamp,3.14159*.205*.205*studioSize*studioSize,smoothstep(.6,1.4,footprint));
        vec3 c=mix(vec3(.35,.61,1.),vec3(.86,.94,1.),smoothstep(.1,1.5,wave));
        float diode=mix(1.,lamp,studioLed);
        gl_FragColor=vec4(mix(vec3(.002,.004,.008),vec3(.012,.017,.028),housing)+c*diode*intensity,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  material.userData.authoredDisplay = true;
  return material;
}

function wetReflection(renderer: THREE.WebGLRenderer, floor: THREE.Mesh) {
  const mirror = new Reflector(new THREE.PlaneGeometry(190, 170), {
    color: 0xa5b3c6, textureWidth: 960, textureHeight: 540, multisample: 0, clipBias: .004,
  });
  mirror.name = 'WET_GROUND_REFLECTION'; mirror.rotation.x = -Math.PI / 2; mirror.position.y = -.031;
  const reflect = mirror.onBeforeRender;
  mirror.onBeforeRender = function (...args) {
    // The receiving plane must never appear in its own reflected camera.
    const visible = floor.visible; floor.visible = false;
    try { reflect.apply(this, args); } finally { floor.visible = visible; }
  };
  const material = mirror.material as THREE.ShaderMaterial;
  material.vertexShader = material.vertexShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 vGround;')
    .replace('vUv = textureMatrix * vec4( position, 1.0 );', 'vUv = textureMatrix * vec4( position, 1.0 ); vGround=position.xy;');
  material.fragmentShader = material.fragmentShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 vGround;')
    .replace('vec4 base = texture2DProj( tDiffuse, vUv );', `
      vec2 p=vUv.xy/vUv.w;
      float grain=sin(vGround.x*57.+sin(vGround.y*31.))*sin(vGround.y*91.+vGround.x*19.);
      float footprint=max(length(dFdx(vGround)),length(dFdy(vGround)));
      float detail=1.-smoothstep(.025,.15,footprint);
      p+=vec2(grain*.0007,sin(vGround.y*74.)*.0006)*detail;
      vec2 blur=vec2(.0008,.0016);
      vec4 base=texture2D(tDiffuse,p)*.4+texture2D(tDiffuse,p+blur)*.3+texture2D(tDiffuse,p-blur)*.3;
      base.rgb*=.62+.1*sin(vGround.y*2.1+sin(vGround.x*3.8));`);
  const surface = floor.material as THREE.MeshStandardMaterial;
  surface.transparent = true; surface.opacity = .36; surface.depthWrite = false;
  surface.polygonOffset = true; surface.polygonOffsetFactor = -2; surface.polygonOffsetUnits = -2;
  // The authored roughness map already contains the physical value; another
  // .3 multiplier would turn the whole plaza into an almost perfect mirror.
  surface.roughness = 1; surface.metalness = .08;
  return { mirror, resize(width: number, height: number) {
    const target = mirror.getRenderTarget();
    target.setSize(Math.min(1280, Math.max(1, Math.round(width * renderer.getPixelRatio() / 2))),
      Math.min(720, Math.max(1, Math.round(height * renderer.getPixelRatio() / 2))));
  } };
}

/** Models and camera are authored in Blender; only dynamic light and wet reflection live here. */
export async function loadBlenderNightScene(renderer: THREE.WebGLRenderer, kind: 'fluid' | 'field'): Promise<NativeNightScene> {
  const ktx = new KTX2Loader().setTranscoderPath('/assets/decoders/basis/').detectSupport(renderer);
  const loader = new GLTFLoader().setKTX2Loader(ktx).setMeshoptDecoder(MeshoptDecoder);
  let gltf;
  try { gltf = await loader.loadAsync(`${MODEL_ROOT}${kind}-web.glb`); }
  catch (cause) { ktx.dispose(); throw new Error(`Blender 场景加载失败：${kind}。请重试。`, { cause }); }
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#101e34');
  scene.add(gltf.scene);
  const authoredCamera = (gltf.scene.getObjectByName('CAM_REFERENCE') ?? gltf.cameras[0]) as THREE.PerspectiveCamera | undefined;
  const floor = gltf.scene.getObjectByName('GROUND_WET') as THREE.Mesh | undefined;
  const authoredDisplay = gltf.scene.getObjectByName('MEDIA_FACADE') as THREE.Mesh | undefined;
  const hasDisplay = kind === 'fluid' ? !!authoredDisplay?.geometry?.attributes.uv : !!gltf.scene.getObjectByName('COLUMN_EMITTER_000');
  if (!authoredCamera || !floor || !hasDisplay) {
    // Returned resources are owned by the host even when required authoring metadata is missing.
    gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose();
      for (const m of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const t of Object.values(m)) if (t instanceof THREE.Texture) t.dispose(); m.dispose();
      } } });
    ktx.dispose(); throw new Error(`GLB ${kind} 缺少参考相机、地面或显示网格。`);
  }
  gltf.scene.updateMatrixWorld(true);
  const position = authoredCamera.getWorldPosition(new THREE.Vector3());
  const rawTarget = authoredCamera.userData.target as number[];
  const target = rawTarget ? new THREE.Vector3(rawTarget[0], rawTarget[2], -rawTarget[1]) : new THREE.Vector3(0, 6, 0);
  const distance = position.distanceTo(target);
  const ref = wetReflection(renderer, floor); scene.add(ref.mirror);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .08); scene.environment = environment.texture; scene.environmentIntensity = .12;
  room.dispose(); pmrem.dispose();
  const ambient = new THREE.HemisphereLight(0x6885b8, 0x362a20, .65); scene.add(ambient);
  const key = new THREE.DirectionalLight(0xb4ceff, .85); key.position.set(-20, 45, 5); scene.add(key);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: .1, far: 120 });
  key.shadow.bias = -.0003; key.shadow.normalBias = .025; key.shadow.autoUpdate = false; key.shadow.needsUpdate = true;
  const retired = { geometries: new Set<THREE.BufferGeometry>(), materials: new Set<THREE.Material>() };
  scene.userData.retiredResources = retired;
  gltf.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = !/SKY|GLASS|COLUMN_SHELL|MEDIA_|LED_PREVIEW/.test(object.name);
    if (object === floor) object.castShadow = false;
    object.receiveShadow = object.name !== 'SKY_DOME';
    const ms = Array.isArray(object.material) ? object.material : [object.material];
    for (const m of ms) {
      // Millimetre-thick pavement seams share the static metal batch. They must
      // not cast unstable depth-map shadows onto the receiving ground plane.
      if (object.name.startsWith('STATIC') && /graphite anodised metal/.test(m.name)) object.castShadow = false;
      if (m instanceof THREE.MeshStandardMaterial) { m.envMapIntensity = .18; }
      if (/glass|acrylic/i.test(m.name)) { m.depthWrite = false; m.side = THREE.DoubleSide; }
      if (/leaf/i.test(m.name)) m.side = THREE.DoubleSide;
      for (const t of Object.values(m)) if (t instanceof THREE.Texture) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    }
    if (object.name.startsWith('LED_PREVIEW')) object.visible = false;
    if (object.name === 'SKY_DOME') { object.castShadow = false; object.receiveShadow = false;
      for (const m of ms) { if (m instanceof THREE.MeshStandardMaterial) { m.emissiveIntensity = .8; m.fog = false; } } }
  });
  const accentLights: THREE.PointLight[] = [];
  const addLight = (color: number, intensity: number, pos: number[], range: number) => {
    const light = new THREE.PointLight(color, intensity, range, 2); light.position.fromArray(pos); scene.add(light); accentLights.push(light); return light;
  };
  if (kind === 'fluid') for (const x of [-15, -7, 1, 9, 17]) addLight(0xffd49a, 24, [x, 3.5, 1], 15);
  else addLight(0xffd49a, 20, [17, 3.8, -8], 12);
  for (const [x,z] of (kind === 'fluid' ? [[-28,7],[27,8],[-12,27],[37,8]] : [[-25,16],[31,10],[-30,-8],[29,-15]]))
    addLight(0xffbc6b, 45, [x, 1.8, z], 12);
  let displayMesh: THREE.Mesh | undefined, material: THREE.ShaderMaterial | undefined;
  const grid: [number, number] = [165, 30];
  const lighting = createColumnLighting('reference');
  const materials: THREE.ShaderMaterial[] = [], pools: THREE.PointLight[] = [];
  if (kind === 'fluid') {
    displayMesh = authoredDisplay!;
    const uv = displayMesh.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i); uv.setXY(i, u >= .5 ? (u - .5) * 2 : 1 - u * 2, uv.getY(i)); }
    uv.needsUpdate = true;
    retired.materials.add(displayMesh.material as THREE.Material);
    grid[0] = displayMesh.userData.gridColumns ?? 165; grid[1] = displayMesh.userData.gridRows ?? 30;
    material = facadeMaterial(grid); displayMesh.material = material; displayMesh.visible = true;
  } else {
    gltf.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !object.name.startsWith('COLUMN_EMITTER_')) return;
      const info = object.userData;
      retired.materials.add(object.material as THREE.Material);
      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox!;
      const m = lighting.material(bounds.max.y - bounds.min.y, Number(info.phase), Number(info.palette), true);
      m.uniforms.uBottom.value = bounds.min.y;
      object.material = m; materials.push(m);
      if (materials.length % 12 === 0) {
        const p = object.getWorldPosition(new THREE.Vector3()); p.y = .65;
        pools.push(addLight(Number(info.palette) % 2 ? 0x70ffe0 : 0xb26dff, 8, p.toArray(), 6));
      }
    });
  }
  let activePreset = 'reference';
  return { scene, cameraPosition: position, target, fov: authoredCamera.fov,
    displayMesh, displayGrid: grid, displayAspect: displayMesh?.userData.mediaAspect ?? 8, material, materials,
    cameraLimits: { azimuth: .10, polar: .045, minDistance: distance * .92, maxDistance: distance * 1.08 },
    lightingState: kind === 'field' ? lighting.state : undefined,
    update(time) { if (material) material.uniforms.uTime.value = time;
      if (kind === 'field') { const state = lighting.update(time); pools.forEach(p => { p.intensity = activePreset === 'warm' ? 8 * state.breath : 8; }); } },
    setColumnPreset(preset) { activePreset = preset; lighting.setPreset(preset);
      pools.forEach((p, i) => p.color.setHex(preset === 'warm' ? 0xffdfb4 : i % 2 ? 0x70ffe0 : 0xb26dff)); },
    resize: ref.resize,
    dispose() { environment.dispose(); ktx.dispose(); },
  };
}
