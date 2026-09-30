import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { DEFAULT_SETTINGS, type SceneId, type DisplaySettings, type StoredMedia } from './studioTypes';
export { DEFAULT_SETTINGS } from './studioTypes';
export type { SceneId, DisplaySettings, MediaInfo } from './studioTypes';

const SPHERE_VERTEX = /* glsl */ `
  varying vec2 vDisplayUv;
  void main() {
    vDisplayUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SPHERE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMedia;
  uniform float uAspect;
  uniform float uBrightness;
  uniform float uPixel;
  uniform float uOffset;
  uniform float uDefault;
  varying vec2 vDisplayUv;
  void main() {
    vec2 mediaUV = vec2(fract(vDisplayUv.x + uOffset * 0.25), 1.0 - vDisplayUv.y);
    vec2 grid = vec2(240.0, 144.0);
    vec2 sampleUV = (floor(mediaUV * grid) + 0.5) / grid;
    vec3 source = texture2D(uMedia, clamp(mix(mediaUV, sampleUV, uPixel), vec2(0.003), vec2(0.997))).rgb;
    float diode = 1.0 - smoothstep(0.37, 0.49, length(fract(mediaUV * grid) - 0.5));
    vec3 color = vec3(0.003, 0.006, 0.012) + source * mix(1.0, diode, uPixel * 0.75) * uBrightness * 1.5;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const COLLINS_VERTEX = /* glsl */ `
  varying vec2 vDisplayUv;
  void main() {
    vDisplayUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const COLLINS_FRAGMENT = /* glsl */ `
  uniform sampler2D uMedia;
  uniform float uAspect;
  uniform float uFacadeAspect;
  uniform float uStripCount;
  uniform float uRows;
  uniform float uDotGap;
  uniform float uBrightness;
  uniform float uGlow;
  uniform float uOffsetX;
  uniform float uOffsetY;
  uniform float uTime;
  uniform float uDemo;
  varying vec2 vDisplayUv;
  void main() {
    vec2 grid = vec2(uStripCount, uRows);
    vec2 samplePoint = (floor(vDisplayUv * grid) + 0.5) / grid;
    vec2 mediaUV = vec2(samplePoint.x, 1.0 - samplePoint.y);
    if (uAspect > uFacadeAspect) {
      float visibleWidth = uFacadeAspect / uAspect;
      mediaUV.x = 0.5 + (samplePoint.x - 0.5) * visibleWidth
        + uOffsetX * (1.0 - visibleWidth) * 0.5;
    } else {
      float visibleHeight = uAspect / uFacadeAspect;
      mediaUV.y = 0.5 + (mediaUV.y - 0.5) * visibleHeight
        + uOffsetY * (1.0 - visibleHeight) * 0.5;
    }

    // The original tower's actual strips follow its rising roofline. The UV
    // interval of each strip is centered inside one of the 96 facade cells.
    float across = abs(fract(vDisplayUv.x * uStripCount) - 0.5);
    float width = mix(0.125, 0.065, uDotGap);
    float strip = 1.0 - smoothstep(width - 0.012, width + 0.012, across);
    vec3 color = texture2D(uMedia, clamp(mediaUV, vec2(0.003), vec2(0.997))).rgb;
    if (uDemo > 0.5) {
      float flow = 0.55 + 0.45 * sin(samplePoint.x * 9.0 + samplePoint.y * 3.0 - uTime * 0.25);
      color = max(color, vec3(0.028, 0.10, 0.23) * flow);
    }
    color *= strip * uBrightness * (1.45 + uGlow * 0.35);
    gl_FragColor = vec4(vec3(0.004, 0.006, 0.009) + color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const FACADE_VERTEX = /* glsl */ `
  varying vec2 vDisplayUv;
  void main() {
    vDisplayUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FACADE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMedia;
  uniform float uAspect;
  uniform float uFacadeAspect;
  uniform float uCols;
  uniform float uRows;
  uniform float uBrightness;
  uniform float uDotSize;
  uniform float uLedTexture;
  uniform float uGlow;
  uniform float uOffsetX;
  uniform float uOffsetY;
  uniform float uTime;
  uniform float uDemo;
  uniform float uFluidFill;
  varying vec2 vDisplayUv;

  vec2 coverUv(vec2 point) {
    vec2 mediaUv = point;
    if (uAspect > uFacadeAspect) {
      float visibleWidth = uFacadeAspect / uAspect;
      mediaUv.x = 0.5 + (point.x - 0.5) * visibleWidth
        + uOffsetX * (1.0 - visibleWidth) * 0.5;
    } else {
      float visibleHeight = uAspect / uFacadeAspect;
      mediaUv.y = 0.5 + (point.y - 0.5) * visibleHeight
        + uOffsetY * (1.0 - visibleHeight) * 0.5;
    }
    return clamp(mediaUv, vec2(0.002), vec2(0.998));
  }

  vec3 signalAt(vec2 point) {
      // The Fluid emitter occupies the lower part of its 16:9 canvas. Map
      // that active region across the full curved facade instead of showing
      // it as a narrow band at the bottom of this much wider LED surface.
      vec2 mediaUv = uFluidFill > 0.5
        ? vec2(point.x, (1.0 - point.y) * 0.62)
        : coverUv(vec2(point.x, 1.0 - point.y));
      vec3 media = texture2D(uMedia, clamp(mediaUv, vec2(0.002), vec2(0.998))).rgb;
      if (uFluidFill > 0.5) {
        // One LED cell covers several tiny video particles. Gather nearby
        // energy so sparse point samples do not leave blank horizontal bands.
        vec3 nearby = max(texture2D(uMedia, clamp(mediaUv + vec2(0.012, 0.0), vec2(0.002), vec2(0.998))).rgb,
                          texture2D(uMedia, clamp(mediaUv - vec2(0.012, 0.0), vec2(0.002), vec2(0.998))).rgb);
        nearby = max(nearby, texture2D(uMedia, clamp(mediaUv + vec2(0.0, 0.018), vec2(0.002), vec2(0.998))).rgb);
        nearby = max(nearby, texture2D(uMedia, clamp(mediaUv - vec2(0.0, 0.018), vec2(0.002), vec2(0.998))).rgb);
        media = max(media, nearby * 0.75);
        return max(media, vec3(0.16, 0.13, 0.10));
      }
      if (uDemo > 0.5) {
        float flow = 0.5 + 0.5 * sin(point.x * 8.0 + point.y * 4.5 - uTime * 0.32);
        media = max(media, vec3(0.035, 0.18, 0.38) * (0.35 + 0.65 * flow));
      }
      return media;
  }

  void main() {
    vec2 grid = vec2(uCols, uRows);
    vec2 point = (floor(vDisplayUv * grid) + 0.5) / grid;
    vec3 source = signalAt(point);
    vec2 cell = fract(vDisplayUv * grid) - 0.5;
    float distanceToCenter = length(cell);
    float sizeVariation = fract(sin(dot(floor(vDisplayUv * grid), vec2(41.37, 17.91))) * 43758.5453);
    float radius = mix(0.12, 0.38, uDotSize) * mix(0.66, 1.24, sizeVariation);
    float core = 1.0 - smoothstep(radius - 0.045, radius + 0.045, distanceToCenter);
    float halo = exp(-pow(distanceToCenter / (radius + 0.15), 2.0));
    vec3 smoothSource = signalAt(vDisplayUv);
    vec3 dotSource = source * (core + halo * uGlow * 0.27);
    vec3 color = vec3(0.0015, 0.004, 0.009);
    color += mix(smoothSource, dotSource, uLedTexture) * uBrightness;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const REFLECTION_VERTEX = /* glsl */ `
  varying vec2 vReflectionUv;
  void main() {
    vReflectionUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const REFLECTION_FRAGMENT = /* glsl */ `
  uniform sampler2D uMedia;
  uniform float uAspect;
  uniform float uFacadeAspect;
  uniform float uBrightness;
  uniform float uOffsetX;
  uniform float uOffsetY;
  uniform float uTime;
  uniform float uDemo;
  varying vec2 vReflectionUv;

  vec2 coverUv(vec2 point) {
    vec2 mediaUv = point;
    if (uAspect > uFacadeAspect) {
      float visibleWidth = uFacadeAspect / uAspect;
      mediaUv.x = 0.5 + (point.x - 0.5) * visibleWidth
        + uOffsetX * (1.0 - visibleWidth) * 0.5;
    } else {
      float visibleHeight = uAspect / uFacadeAspect;
      mediaUv.y = 0.5 + (point.y - 0.5) * visibleHeight
        + uOffsetY * (1.0 - visibleHeight) * 0.5;
    }
    return clamp(mediaUv, vec2(0.002), vec2(0.998));
  }

  vec3 signalAt(vec2 point) {
    if (uDemo < 0.5) {
      // Reflection UVs already run away from the facade, so their near edge
      // samples the corrected facade's bottom edge without another flip.
      vec2 p = coverUv(point);
      return (
        texture2D(uMedia, p).rgb * 0.36 +
        texture2D(uMedia, clamp(p + vec2(0.012, 0.012), vec2(0.002), vec2(0.998))).rgb * 0.16 +
        texture2D(uMedia, clamp(p - vec2(0.012, 0.012), vec2(0.002), vec2(0.998))).rgb * 0.16 +
        texture2D(uMedia, clamp(p + vec2(-0.019, 0.01), vec2(0.002), vec2(0.998))).rgb * 0.16 +
        texture2D(uMedia, clamp(p + vec2(0.019, -0.01), vec2(0.002), vec2(0.998))).rgb * 0.16
      );
    }
    float flow = 0.5 + 0.5 * sin(point.x * 8.0 - uTime * 0.38 + point.y * 3.5);
    float drift = 0.5 + 0.5 * sin(point.y * 7.0 + point.x * 2.8 + uTime * 0.23);
    float energy = 0.18 + 0.53 * flow * (0.58 + 0.42 * drift);
    return mix(vec3(0.005, 0.034, 0.10), vec3(0.075, 0.31, 0.55), energy);
  }

  void main() {
    vec2 point = vec2(vReflectionUv.x, 1.0 - vReflectionUv.y);
    float edge = smoothstep(0.0, 0.16, vReflectionUv.x)
      * (1.0 - smoothstep(0.84, 1.0, vReflectionUv.x));
    float fade = pow(1.0 - vReflectionUv.y, 2.0) * edge;
    float streak = 1.0;
    vec3 color = signalAt(point) * fade * streak * uBrightness * 1.05;
    float lobby = exp(-pow(vReflectionUv.y / 0.24, 2.0));
    color += vec3(0.13, 0.061, 0.014) * lobby * streak;
    gl_FragColor = vec4(color, fade * 0.08);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const INITIAL_VIEW: Record<SceneId, { camera: THREE.Vector3; target: THREE.Vector3 }> = {
  collins: { camera: new THREE.Vector3(0, 16, 62), target: new THREE.Vector3(18, 20, -16) },
  facade: { camera: new THREE.Vector3(-9, 2.5, 34), target: new THREE.Vector3(9, 7.5, -4) },
  sphere: { camera: new THREE.Vector3(0, 7, 43), target: new THREE.Vector3(0, 8, -18) },
};

type Runtime = {
  root: THREE.Group | null;
  material: THREE.ShaderMaterial;
  reflection: THREE.ShaderMaterial | null;
  texture: THREE.Texture;
  aspect: number;
  isDefault: boolean;
  loadVersion: number;
  camera: THREE.Vector3;
  target: THREE.Vector3;
  settings: DisplaySettings;
};

function fallbackTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array([8, 25, 46, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

export class SceneStudio {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(43, 1, 0.1, 600);
  private readonly controls: OrbitControls;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly observer: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private readonly runtimes: Record<SceneId, Runtime>;
  private readonly models: Partial<Record<SceneId, Promise<void>>> = {};
  private readonly loader: GLTFLoader;
  private readonly draco: DRACOLoader;
  private ezTreeTemplate: THREE.Group | null = null;
  private readonly fallbackBackground = new THREE.Color(0x081323);
  private readonly environmentReady: Promise<void>;
  private environmentTarget: THREE.WebGLRenderTarget | null = null;
  private readonly skyPoints: THREE.Points;
  private active: SceneId = 'collins';
  private frame = 0;
  private disposed = false;
  private liveTexture: THREE.CanvasTexture | null = null;
  private fluidTexture: THREE.VideoTexture | null = null;
  private lastLiveUpload = 0;
  private sharedMedia: { texture: THREE.Texture; video: HTMLVideoElement | null } | null = null;
  private mediaSource: 'default' | 'upload' | 'chroma' | 'fluid' = 'default';

  constructor(private readonly host: HTMLElement, onReady: () => void, onError: (message: string) => void) {
    this.scene.background = this.fallbackBackground;
    this.scene.fog = new THREE.FogExp2(0x0c1729, 0.0016);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.host.appendChild(this.renderer.domElement);

    this.camera.position.copy(INITIAL_VIEW.collins.camera);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(INITIAL_VIEW.collins.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 220;
    this.controls.minPolarAngle = 0.40;
    this.controls.maxPolarAngle = 2.12;
    this.controls.update();
    this.renderer.info.autoReset = false;

    const sphereTexture = fallbackTexture();
    const collinsTexture = fallbackTexture();
    const facadeTexture = fallbackTexture();
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMedia: { value: sphereTexture }, uAspect: { value: 16 / 9 },
        uBrightness: { value: 35 / 60 }, uPixel: { value: 0.35 },
        uOffset: { value: 0 }, uDefault: { value: 1 },
      },
      vertexShader: SPHERE_VERTEX, fragmentShader: SPHERE_FRAGMENT,
      side: THREE.DoubleSide,
    });
    const collinsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMedia: { value: collinsTexture }, uAspect: { value: 16 / 9 },
        uFacadeAspect: { value: 1.02 }, uStripCount: { value: 96 }, uRows: { value: 180 }, uDotGap: { value: 0.42 },
        uBrightness: { value: 35 / 60 },
        uGlow: { value: 0.45 }, uOffsetX: { value: 0 },
        uOffsetY: { value: 0 }, uTime: { value: 0 }, uDemo: { value: 1 },
      },
      vertexShader: COLLINS_VERTEX, fragmentShader: COLLINS_FRAGMENT,
      side: THREE.DoubleSide,
    });
    const facadeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMedia: { value: facadeTexture }, uAspect: { value: 16 / 9 },
        uFacadeAspect: { value: 2.6682 }, uCols: { value: 128 }, uRows: { value: 48 },
        uBrightness: { value: 35 / 60 }, uDotSize: { value: 0.55 }, uLedTexture: { value: 1 },
        uGlow: { value: 0.58 }, uOffsetX: { value: 0 },
        uOffsetY: { value: 0 }, uTime: { value: 0 }, uDemo: { value: 1 }, uFluidFill: { value: 0 },
      },
      vertexShader: FACADE_VERTEX, fragmentShader: FACADE_FRAGMENT,
      side: THREE.DoubleSide,
    });
    const reflectionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMedia: { value: facadeTexture }, uAspect: { value: 16 / 9 },
        uFacadeAspect: { value: 2.6682 }, uBrightness: { value: 35 / 60 },
        uOffsetX: { value: 0 }, uOffsetY: { value: 0 },
        uTime: { value: 0 }, uDemo: { value: 1 },
      },
      vertexShader: REFLECTION_VERTEX, fragmentShader: REFLECTION_FRAGMENT,
      side: THREE.DoubleSide, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.runtimes = {
      sphere: {
        root: null, material: sphereMaterial, reflection: null, texture: sphereTexture, aspect: 16 / 9, isDefault: true, loadVersion: 0,
        camera: INITIAL_VIEW.sphere.camera.clone(), target: INITIAL_VIEW.sphere.target.clone(),
        settings: { ...DEFAULT_SETTINGS.sphere },
      },
      collins: {
        root: null, material: collinsMaterial, reflection: null, texture: collinsTexture, aspect: 16 / 9, isDefault: true, loadVersion: 0,
        camera: INITIAL_VIEW.collins.camera.clone(), target: INITIAL_VIEW.collins.target.clone(),
        settings: { ...DEFAULT_SETTINGS.collins },
      },
      facade: {
        root: null, material: facadeMaterial, reflection: reflectionMaterial,
        texture: facadeTexture, aspect: 16 / 9, isDefault: true, loadVersion: 0,
        camera: INITIAL_VIEW.facade.camera.clone(), target: INITIAL_VIEW.facade.target.clone(),
        settings: { ...DEFAULT_SETTINGS.facade },
      },
    };

    this.scene.add(new THREE.HemisphereLight(0xbacbe4, 0x756551, 1.05));
    this.scene.add(new THREE.AmbientLight(0xe4e9f2, 0.25));
    const key = new THREE.DirectionalLight(0xd8e5ff, 1.1);
    key.position.set(-35, 65, 45);
    this.scene.add(key);
    const warm = new THREE.PointLight(0xffd19c, 95, 100);
    warm.position.set(-9, 13, 25);
    this.scene.add(warm);
    const blue = new THREE.PointLight(0x6099ff, 75, 110);
    blue.position.set(22, 32, -18);
    this.scene.add(blue);
    this.skyPoints = this.addSky();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.05, 0.15, 3.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.animate();

    this.draco = new DRACOLoader().setDecoderPath('/assets/light-lab/lightform/draco/');
    this.loader = new GLTFLoader().setDRACOLoader(this.draco);
    this.environmentReady = this.loadNightEnvironment();
    void Promise.all([this.ensureModel('collins'), this.environmentReady])
      .then(() => { if (!this.disposed) onReady(); })
      .catch(() => { if (!this.disposed) onError('街区塔楼场景加载失败，请重试。'); });
    this.setDisplay('sphere', DEFAULT_SETTINGS.sphere);
    this.setDisplay('collins', DEFAULT_SETTINGS.collins);
    this.setDisplay('facade', DEFAULT_SETTINGS.facade);
  }

  private ensureModel(id: SceneId): Promise<void> {
    const models = {
      collins: ['collins_street_web.glb', 'LED_TOWER_STRIPS'],
      facade: ['curved_pavilion_web.glb', 'LED_CURVED_DOTS'],
      sphere: ['dome_pavilion_web.glb', 'LED_DOME_SCREEN'],
    } as const;
    const [file, display] = models[id];
    return this.models[id] ??= this.loadModel(this.loader, id, `/assets/light-lab/lightform/models/${file}`, display);
  }

  private async loadModel(loader: GLTFLoader, id: SceneId, url: string, displayName: string) {
    const [gltf] = await Promise.all([loader.loadAsync(url), this.loadDemo(id)]);
    if (this.disposed) return;
    let found = false;
    let foundReflection = id !== 'facade';
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            // Keep bright fixtures crisp, while separate practical lights and
            // the environment map illuminate the architecture around them.
            const limit = /Halo|Headlight/.test(material.name) ? 3.0 : 5.0;
            material.emissiveIntensity = Math.min(material.emissiveIntensity, limit);
            if (/Smoked glass|Rear dark glass/.test(material.name)) {
              material.color.setRGB(0.06, 0.085, 0.12);
              material.roughness = 0.28;
            }
            if (/Lobby glazing|Tinted blue glass/.test(material.name)) {
              material.transparent = true;
              material.opacity = 0.28;
              material.depthWrite = false;
              material.color.set(0xbacbd5);
              material.roughness = 0.12;
              material.metalness = 0.12;
              material.envMapIntensity = 0.35;
              if (material instanceof THREE.MeshPhysicalMaterial) material.transmission = 0;
            }
            if (material.name === 'Web plaza stone' || material.name === 'M_Wet_Asphalt') {
              material.envMapIntensity = 0.12;
              material.metalness = 0;
              material.roughness = material.name === 'Web plaza stone' ? 0.72 : 0.6;
            }
            if (/Pavement|Granite/.test(material.name)) {
              material.roughness = 0.34;
              material.metalness = 0.15;
            }
          }
        }
      }
      if (object instanceof THREE.Mesh && object.name === displayName) {
        object.material = this.runtimes[id].material;
        object.frustumCulled = false;
        found = true;
        if (!object.geometry.getAttribute('uv')) throw new Error(`${displayName} 缺少媒体 UV。`);
        if (id === 'collins') {
          const uniforms = this.runtimes.collins.material.uniforms;
          uniforms.uFacadeAspect.value = Number(object.userData.facadeAspect) || 1.02;
          uniforms.uStripCount.value = Number(object.userData.stripCount) || 96;
        }
        if (id === 'facade') {
          const uniforms = this.runtimes.facade.material.uniforms;
          const reflection = this.runtimes.facade.reflection!.uniforms;
          const aspect = Number(object.userData.facadeAspect) || 3;
          uniforms.uFacadeAspect.value = aspect;
          uniforms.uCols.value = Number(object.userData.columns) || 168;
          uniforms.uRows.value = Number(object.userData.rows) || 44;
          reflection.uFacadeAspect.value = aspect;
        }
      }
      if (id === 'facade' && object instanceof THREE.Mesh && object.name === 'MEDIA_REFLECTION') {
        object.material = this.runtimes.facade.reflection!;
        object.frustumCulled = false;
        object.renderOrder = 2;
        foundReflection = true;
      }
    });
    if (!found) throw new Error(`${id === 'sphere' ? '球形展馆' : id === 'collins' ? '888 Collins' : '弧形点阵展馆'} 模型缺少 ${displayName} 网格。`);
    if (!foundReflection) throw new Error('弧形点阵展馆模型缺少 MEDIA_REFLECTION 网格。');
    this.addNightLighting(id, gltf.scene);
    await this.attachEzTrees(id, gltf.scene);
    if (this.disposed) return;
    gltf.scene.visible = id === this.active;
    this.runtimes[id].root = gltf.scene;
    this.scene.add(gltf.scene);
    if (id === this.active) {
      this.host.dataset.treeCount = String(gltf.scene.userData.treeCount ?? 0);
      this.host.dataset.treeTriangles = String(gltf.scene.userData.treeTriangles ?? 0);
    }
  }

  private async loadDemo(id: SceneId) {
    const files = { collins: 'vegas-night-panorama-v2.png', facade: 'facade-night-panorama.png', sphere: 'earth-night.png' };
    const texture = await new THREE.TextureLoader().loadAsync(`/assets/light-lab/lightform/media/${files[id]}`);
    if (this.disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const runtime = this.runtimes[id];
    runtime.texture.dispose();
    runtime.texture = texture;
    runtime.aspect = texture.image.width / texture.image.height;
    this.applyCurrentMedia();
  }

  private async loadNightEnvironment() {
    const hdr = await new HDRLoader().loadAsync('/assets/light-lab/lightform/environment/night-city.hdr');
    if (this.disposed) { hdr.dispose(); return; }
    const generator = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = generator.fromEquirectangular(hdr);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.22;
    hdr.dispose();
    generator.dispose();
  }

  private addNightLighting(id: SceneId, root: THREE.Group) {
    type PracticalLight = { name: string; type: string; position: number[]; target: number[]; color: number[]; intensity: number; angle: number };
    const marker = root.getObjectByName('NIGHT_LIGHTING');
    const lights: PracticalLight[] = JSON.parse(marker?.userData.lighting ?? '[]');
    for (const fixture of lights) {
      const color = new THREE.Color().setRGB(fixture.color[0], fixture.color[1], fixture.color[2]);
      const light = fixture.type === 'SPOT'
        ? new THREE.SpotLight(color, fixture.intensity * 0.15, 45, Math.min(1.2, fixture.angle), 0.7, 2)
        : new THREE.PointLight(color, fixture.intensity * 0.35, 22, 2);
      light.name = `Night ${fixture.name}`;
      light.position.fromArray(fixture.position);
      root.add(light);
      if (light instanceof THREE.SpotLight) {
        light.target.position.fromArray(fixture.target);
        root.add(light.target);
      }
    }
    const lobby = root.getObjectByName(id === 'facade' ? 'GLASS_LOBBY' : 'GROUND_FLOOR_LOBBY');
    if (lobby) {
      const box = new THREE.Box3().setFromObject(lobby);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      for (const fraction of id === 'facade' ? [0.2, 0.5, 0.8] : [0.35, 0.65]) {
        const light = new THREE.PointLight(0xffd6a4, id === 'facade' ? 30 : 40, 16, 2);
        light.position.set(box.min.x + size.x * fraction, box.max.y - 0.35, center.z);
        root.add(light);
      }
    }
  }

  private async attachEzTrees(id: SceneId, root: THREE.Group) {
    const canopyOnly = id === 'facade';
    const proxies: THREE.Object3D[] = [];
    root.traverse((object) => {
      if (canopyOnly ? object.name === 'Env_Feature_Tree_Sculpted'
        : /^(Realistic_Tree_|Tree_Left_|Tree_Right_)\d+$/.test(object.name)) proxies.push(object);
    });
    root.userData.treeCount = proxies.length;
    if (!proxies.length) return;
    try {
      if (!this.ezTreeTemplate) {
        const { Tree } = await import('@dgreenheck/ez-tree');
        if (this.disposed) return;
        const tree = new Tree();
        tree.loadPreset('Ash Small');
        tree.options.bark.textured = false;
        tree.options.branch.children[0] = 8;
        tree.options.branch.children[1] = 4;
        tree.options.leaves.count = 24;
        tree.options.leaves.size = 3.5;
        tree.options.leaves.alphaTest = 0.25;
        tree.options.leaves.billboard = 'double';
        tree.generate();
        this.ezTreeTemplate = tree;
      }
      root.updateWorldMatrix(true, true);
      const template = this.ezTreeTemplate;
      const sourceBox = new THREE.Box3().setFromObject(template);
      const sourceSize = sourceBox.getSize(new THREE.Vector3());
      let trianglesPerTree = 0;
      template.traverse((object) => {
        if (object instanceof THREE.Mesh && object.geometry && (!canopyOnly || object !== template.children[0])) {
          trianglesPerTree += (object.geometry.index?.count ?? object.geometry.getAttribute('position')?.count ?? 0) / 3;
        }
      });
      root.userData.treeTriangles = Math.round(trianglesPerTree * proxies.length);
      proxies.forEach((proxy, index) => {
        const bounds = new THREE.Box3().setFromObject(proxy);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        center.y = bounds.min.y;
        const tree = template.clone(true);
        tree.name = `EZ Tree ${index + 1}`;
        if (canopyOnly) tree.children[0].visible = false;
        tree.position.copy(root.worldToLocal(center));
        tree.scale.set(size.x / sourceSize.x, size.y / sourceSize.y, size.z / sourceSize.z);
        tree.rotation.y = (index * 2.399963) % (Math.PI * 2);
        root.add(tree);
        if (!canopyOnly) proxy.visible = false;
      });
    } catch (error) {
      // The light GLB tree proxies remain visible if EZ-Tree cannot initialize.
      console.warn('EZ-Tree unavailable; using bundled tree proxies.', error);
    }
  }

  private addSky() {
    const vertices: number[] = [];
    let seed = 51;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 430; i++) vertices.push((random() - 0.5) * 115, 8 + random() * 40, -22 - random() * 65);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const sky = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xa9c7ff, size: 0.14, transparent: true, opacity: 0.65 }));
    this.scene.add(sky);
    sky.visible = false;
    return sky;
  }

  private applyEnvironment() {
    this.scene.background = this.fallbackBackground;
    this.skyPoints.visible = false;
  }

  private resize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    // The compact topbar occupies a larger share of a phone's 16:9 stage.
    // Give the models a little more headroom without changing the stage ratio.
    this.camera.fov = this.active === 'facade' ? 49 : this.active === 'collins' ? 48 : 43;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
    this.bloom?.setSize(width, height);
  }

  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    this.renderer.info.reset();
    const now = performance.now();
    if (!document.hidden && this.mediaSource === 'chroma' && this.liveTexture && now - this.lastLiveUpload >= 1000 / 30) {
      this.liveTexture.needsUpdate = true;
      this.lastLiveUpload = now;
    }
    this.controls.update();
    this.runtimes.collins.material.uniforms.uTime.value = this.clock.getElapsedTime();
    this.runtimes.facade.material.uniforms.uTime.value = this.clock.elapsedTime;
    this.runtimes.facade.reflection!.uniforms.uTime.value = this.clock.elapsedTime;
    this.composer.render();
    const calls = String(this.renderer.info.render.calls);
    if (this.host.dataset.drawCalls !== calls) this.host.dataset.drawCalls = calls;
  };

  async setScene(id: SceneId) {
    if (id === this.active) return;
    await this.ensureModel(id);
    if (this.disposed) return;
    const old = this.runtimes[this.active];
    old.camera.copy(this.camera.position);
    old.target.copy(this.controls.target);
    if (old.root) old.root.visible = false;
    this.active = id;
    this.applyEnvironment();
    this.resize();
    const next = this.runtimes[id];
    if (next.root) next.root.visible = true;
    this.host.dataset.treeCount = String(next.root?.userData.treeCount ?? 0);
    this.host.dataset.treeTriangles = String(next.root?.userData.treeTriangles ?? 0);
    this.camera.position.copy(next.camera);
    this.controls.target.copy(next.target);
    this.controls.minDistance = id === 'facade' ? 5 : 8;
    this.controls.maxDistance = 220;
    this.controls.update();
    this.setDisplay(id, next.settings);
  }

  private applyTexture(id: SceneId, texture: THREE.Texture, aspect: number, isDefault: boolean) {
    const runtime = this.runtimes[id];
    runtime.material.uniforms.uMedia.value = texture;
    runtime.material.uniforms.uAspect.value = aspect;
    if (id === 'sphere') runtime.material.uniforms.uDefault.value = isDefault ? 1 : 0;
    else runtime.material.uniforms.uDemo.value = isDefault ? 1 : 0;
    if (id === 'facade') runtime.material.uniforms.uFluidFill.value = this.mediaSource === 'fluid' ? 1 : 0;
    if (runtime.reflection) {
      runtime.reflection.uniforms.uMedia.value = texture;
      runtime.reflection.uniforms.uAspect.value = aspect;
      runtime.reflection.uniforms.uDemo.value = isDefault ? 1 : 0;
    }
  }

  setLiveCanvas(canvas: HTMLCanvasElement | null) {
    this.liveTexture?.dispose();
    this.liveTexture = canvas ? new THREE.CanvasTexture(canvas) : null;
    if (this.liveTexture) {
      this.liveTexture.colorSpace = THREE.SRGBColorSpace;
      this.liveTexture.generateMipmaps = false;
      this.liveTexture.minFilter = THREE.LinearFilter;
      this.liveTexture.magFilter = THREE.LinearFilter;
    }
    if (this.mediaSource === 'chroma') this.applyCurrentMedia();
    this.lastLiveUpload = 0;
  }

  setFluidVideo(video: HTMLVideoElement | null) {
    this.fluidTexture?.dispose();
    this.fluidTexture = video ? new THREE.VideoTexture(video) : null;
    if (this.fluidTexture) {
      this.fluidTexture.colorSpace = THREE.SRGBColorSpace;
      this.fluidTexture.generateMipmaps = false;
      this.fluidTexture.minFilter = THREE.LinearFilter;
      this.fluidTexture.magFilter = THREE.LinearFilter;
    }
    if (this.mediaSource === 'fluid') this.applyCurrentMedia();
  }

  private applyCurrentMedia() {
    for (const id of ['sphere', 'collins', 'facade'] as const) {
      const runtime = this.runtimes[id];
      if (this.mediaSource === 'chroma' && this.liveTexture) {
        const canvas = this.liveTexture.image as HTMLCanvasElement;
        this.applyTexture(id, this.liveTexture, canvas.width / canvas.height, false);
      } else if (this.mediaSource === 'fluid' && this.fluidTexture) {
        const video = this.fluidTexture.image as HTMLVideoElement;
        this.applyTexture(id, this.fluidTexture, video.videoWidth / video.videoHeight, false);
      } else if (this.mediaSource === 'upload' && this.sharedMedia) {
        const image = this.sharedMedia.texture.image as HTMLImageElement | HTMLVideoElement;
        const width = image instanceof HTMLVideoElement ? image.videoWidth : image.naturalWidth || image.width;
        const height = image instanceof HTMLVideoElement ? image.videoHeight : image.naturalHeight || image.height;
        this.applyTexture(id, this.sharedMedia.texture, width / height, false);
      } else {
        this.applyTexture(id, runtime.texture, runtime.aspect, runtime.isDefault);
      }
    }
  }

  setLiveSource(source: 'chroma' | 'fluid' | null) {
    this.mediaSource = source ?? (this.sharedMedia ? 'upload' : 'default');
    this.applyCurrentMedia();
  }

  setStoredMedia(media: StoredMedia | null) {
    this.sharedMedia?.texture.dispose();
    this.sharedMedia = null;
    if (media) {
      const video = media.element instanceof HTMLVideoElement ? media.element : null;
      const texture = video ? new THREE.VideoTexture(video) : new THREE.Texture(media.element);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.sharedMedia = { texture, video };
    }
    if (this.mediaSource !== 'chroma' && this.mediaSource !== 'fluid') this.mediaSource = media ? 'upload' : 'default';
    this.applyCurrentMedia();
  }
  setDisplay(id: SceneId, settings: DisplaySettings) {
    const runtime = this.runtimes[id];
    runtime.settings = { ...settings };
    runtime.material.uniforms.uBrightness.value = settings.brightness / 60;
    if (id === 'sphere') {
      runtime.material.uniforms.uPixel.value = settings.pixel / 100;
      runtime.material.uniforms.uOffset.value = settings.offset / 100;
      if (this.active === id) this.bloom.strength = 0.025 + settings.brightness / 2400;
    } else if (id === 'collins') {
      runtime.material.uniforms.uDotGap.value = settings.dotGap / 100;
      runtime.material.uniforms.uGlow.value = settings.glow / 100;
      runtime.material.uniforms.uOffsetX.value = settings.offset / 50;
      runtime.material.uniforms.uOffsetY.value = settings.vertical / 50;
      if (this.active === id) this.bloom.strength = 0.025 + settings.glow / 2400;
    } else {
      runtime.material.uniforms.uDotSize.value = settings.pixel / 100;
      runtime.material.uniforms.uLedTexture.value = settings.ledTexture / 100;
      runtime.material.uniforms.uGlow.value = settings.glow / 100;
      runtime.material.uniforms.uOffsetX.value = settings.offset / 50;
      runtime.material.uniforms.uOffsetY.value = settings.vertical / 50;
      const reflection = runtime.reflection!.uniforms;
      reflection.uBrightness.value = settings.brightness / 60;
      reflection.uOffsetX.value = settings.offset / 50;
      reflection.uOffsetY.value = settings.vertical / 50;
      if (this.active === id) this.bloom.strength = 0.025 + settings.glow / 2400;
    }
  }

  getVideo() { return this.mediaSource === 'upload' ? this.sharedMedia?.video ?? null : null; }
  getActiveScene() { return this.active; }

  resetView() {
    const view = INITIAL_VIEW[this.active];
    this.camera.position.copy(view.camera);
    this.controls.target.copy(view.target);
    this.controls.update();
  }

  setView(view: 'front' | 'side' | 'high') {
    const id = this.active;
    const position = id === 'sphere'
      ? view === 'front' ? new THREE.Vector3(0, 8, 42)
        : view === 'side' ? new THREE.Vector3(40, 12, 0) : new THREE.Vector3(25, 39, 30)
      : id === 'collins' ? view === 'front' ? new THREE.Vector3(18, 19, 60)
        : view === 'side' ? new THREE.Vector3(-45, 21, 18) : new THREE.Vector3(17, 62, 54)
      : view === 'front' ? new THREE.Vector3(11, 6, 22)
        : view === 'side' ? new THREE.Vector3(-25, 8, -3) : new THREE.Vector3(4, 31, 22);
    this.camera.position.copy(position);
    this.controls.target.copy(INITIAL_VIEW[id].target);
    this.controls.update();
  }

  exportPng() {
    this.composer.render();
    const link = document.createElement('a');
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.download = `${this.active}-studio-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  dispose() {
    this.disposed = true;

    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    for (const id of ['sphere', 'collins', 'facade'] as const) {
      ++this.runtimes[id].loadVersion;
      this.runtimes[id].texture.dispose();
      this.runtimes[id].material.dispose();
      this.runtimes[id].reflection?.dispose();
    }
    this.draco.dispose();
    this.liveTexture?.dispose();
    this.liveTexture = null;
    this.fluidTexture?.dispose();
    this.fluidTexture = null;
    this.sharedMedia?.texture.dispose();
    this.sharedMedia = null;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        geometries.add(object.geometry);
        if (Array.isArray(object.material)) object.material.forEach((material) => materials.add(material));
        else materials.add(object.material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    this.environmentTarget?.dispose();
    this.renderer.domElement.remove();
  }
}
