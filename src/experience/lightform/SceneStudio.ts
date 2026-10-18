import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { FieldMedia } from '../particles/types';
import { batchEnvironment } from './night/batchEnvironment';
import { NIGHT_CONFIG } from './sceneConfig';
import { mediaTransform, mapMediaPoint } from './mediaMapping';
import { bindNightSurfaces, type NativeNightScene, type NightSurfaces } from './nightSurfaces';
import type { DisplaySettings, NightSceneId, StoredMedia, StudioPointer, StudioRenderer } from './studioTypes';

type Runtime = { native: NativeNightScene; display: NightSurfaces; camera: THREE.Vector3; target: THREE.Vector3 };
type Source = 'default' | 'upload' | 'chroma' | 'fluid' | 'particles';

/** One renderer/composer; each native scene owns its environment and geometry. */
export class SceneStudio implements StudioRenderer<NightSceneId> {
  readonly renderer: THREE.WebGLRenderer;
  private camera = new THREE.PerspectiveCamera(43, 1, .1, 260);
  private controls: OrbitControls;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloom: UnrealBloomPass;
  private observer: ResizeObserver;
  private runtimes = new Map<NightSceneId, Runtime>();
  private loading = new Map<NightSceneId, Promise<Runtime>>();
  private ownedScenes = new Set<NativeNightScene>();
  private disposedScenes = new WeakSet<NativeNightScene>();
  private settings = new Map(NIGHT_CONFIG.scenes.map(scene => [scene.id, { ...scene.settings }]));
  private active: NightSceneId = 'dome';
  private disposed = false;
  private frame = 0;
  private switchVersion = 0;
  private source: Source = 'default';
  private uploadTexture: THREE.Texture | null = null;
  private liveTexture: THREE.CanvasTexture | null = null;
  private fluidTexture: THREE.VideoTexture | null = null;
  private particleTexture: THREE.Texture | null = null;
  private particleMedia: FieldMedia | null = null;
  private uploadAspect = 1;
  private lastUpload = 0;
  private interaction = false;
  private raycaster = new THREE.Raycaster();
  private started = performance.now();

  constructor(private host: HTMLElement, onReady: () => void, private onError: (message: string) => void,
    private onPointer?: (pointer: StudioPointer | null) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    host.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = .055;
    this.controls.enablePan = false; this.controls.minDistance = 12; this.controls.maxDistance = 72;
    this.controls.minPolarAngle = .15; this.controls.maxPolarAngle = Math.PI / 2.05;
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(new THREE.Scene(), this.camera); this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .52, .36, .9);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointerup', this.pointerLeave);
    canvas.addEventListener('pointercancel', this.pointerLeave);
    canvas.addEventListener('pointerleave', this.pointerLeave);
    canvas.addEventListener('contextmenu', this.contextMenu);
    this.resize();
    void this.setScene('dome').then(() => { if (!this.disposed) { onReady(); this.animate(); } }).catch(error => {
      if (!this.disposed) onError(error instanceof Error ? error.message : '场景加载失败。');
    });
  }

  private async load(id: NightSceneId): Promise<Runtime> {
    const cached = this.runtimes.get(id); if (cached) return cached;
    const pending = this.loading.get(id); if (pending) return pending;
    const task = (async () => {
      let native: NativeNightScene;
      if (id === 'dome') { const module = await import('./night/domeScene'); if (this.disposed) throw new Error('场景已关闭。'); native = module.createDomeScene(this.renderer) as NativeNightScene; }
      else { const module = await import('./night/referenceScenes'); if (this.disposed) throw new Error('场景已关闭。'); native = (id === 'fluid' ? module.createFluidScene() : module.createLightFieldScene()) as NativeNightScene; }
      this.ownedScenes.add(native);
      if (this.disposed) { this.disposeNative(native); throw new Error('场景已关闭。'); }
      try {
        await native.ready;
        if (this.disposed) throw new Error('场景已关闭。');
        if (id === 'fluid' || id === 'field') batchEnvironment(native.scene, new Set());
        const runtime: Runtime = { native, display: bindNightSurfaces(id, native), camera: native.cameraPosition.clone(), target: native.target.clone() };
        this.runtimes.set(id, runtime);
        this.applyMedia(runtime, id);
        return runtime;
      } catch (error) { this.disposeNative(native); throw error; }
    })();
    this.loading.set(id, task);
    try { return await task; } finally { this.loading.delete(id); }
  }

  async setScene(id: NightSceneId) {
    const version = ++this.switchVersion;
    const runtime = await this.load(id);
    if (this.disposed || version !== this.switchVersion) return;
    const old = this.runtimes.get(this.active);
    if (old && this.renderPass.scene === old.native.scene) { old.camera.copy(this.camera.position); old.target.copy(this.controls.target); }
    this.pointerLeave(); this.active = id;
    this.renderPass.scene = runtime.native.scene;
    this.camera.fov = runtime.native.fov ?? 43;
    this.camera.position.copy(runtime.camera); this.controls.target.copy(runtime.target);
    this.controls.minDistance = id === 'dome' ? 15 : 10;
    this.controls.enabled = id === 'field' || !this.interaction;
    this.controls.update(); this.resize(); this.applyMedia(runtime, id);
    this.host.dataset.source = id === 'field' ? 'autonomous' : this.source;
    this.host.dataset.scene = id; this.host.dataset.displayCount = String(id === 'field' ? runtime.native.materials?.length ?? 0 : runtime.display.surfaces.length);
    this.host.dataset.surfaceAspect = String(runtime.display.aspect);
  }

  private resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false); this.composer.setSize(width, height);
  }
  private animate = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    if (document.hidden) return;
    const now = performance.now();
    if (now - this.lastUpload >= 1000 / 30) {
      if (this.source === 'chroma' && this.liveTexture) this.liveTexture.needsUpdate = true;
      if (this.source === 'particles' && this.particleTexture instanceof THREE.CanvasTexture) this.particleTexture.needsUpdate = true;
      this.lastUpload = now;
    }
    this.controls.update();
    const runtime = this.runtimes.get(this.active); runtime?.native.update?.((now - this.started) / 1000);
    if (runtime?.native.lightingState) {
      this.host.dataset.columnFill = runtime.native.lightingState.fill.toFixed(3);
      this.host.dataset.columnBreath = runtime.native.lightingState.breath.toFixed(3);
    }
    this.renderer.info.reset(); this.composer.render();
    this.host.dataset.drawCalls = String(this.renderer.info.render.calls);
  };

  private selectedMedia(): { texture: THREE.Texture; aspect: number } | null {
    if (this.source === 'upload' && this.uploadTexture) return { texture: this.uploadTexture, aspect: this.uploadAspect };
    if (this.source === 'chroma' && this.liveTexture) {
      const canvas = this.liveTexture.image as HTMLCanvasElement;
      return { texture: this.liveTexture, aspect: canvas.width / canvas.height || 16 / 9 };
    }
    if (this.source === 'fluid' && this.fluidTexture) {
      const video = this.fluidTexture.image as HTMLVideoElement;
      return { texture: this.fluidTexture, aspect: video.videoWidth / video.videoHeight || 16 / 9 };
    }
    if (this.source === 'particles' && this.particleTexture) {
      const media = this.particleMedia!;
      return { texture: this.particleTexture, aspect: media instanceof HTMLVideoElement ? media.videoWidth / media.videoHeight || 16 / 9 : media.width / media.height || 16 / 9 };
    }
    return null;
  }
  private applyMedia(runtime: Runtime, id: NightSceneId) {
    const selected = id === 'field' ? null : this.selectedMedia(), settings = this.settings.get(id)!;
    if (id === 'field') for (const material of runtime.native.materials ?? []) material.uniforms.uOn.value = settings.brightness / 58;
    for (const surface of runtime.display.surfaces) {
      for (const original of Array.isArray(surface.nativeMaterial) ? surface.nativeMaterial : [surface.nativeMaterial]) {
        if (original instanceof THREE.ShaderMaterial) {
          if (original.uniforms.uOn) original.uniforms.uOn.value = settings.brightness / 58;
          if (original.uniforms.studioSize) original.uniforms.studioSize.value = (.55 + settings.pixel / 100) / 1.1;
          if (original.uniforms.studioLed) original.uniforms.studioLed.value = settings.ledTexture / 100;
        }
      }
      surface.mesh.geometry = selected ? surface.geometry : surface.nativeGeometry;
      surface.mesh.material = selected ? surface.material : surface.nativeMaterial;
      if (selected) {
        const scale = mediaTransform(runtime.display.aspect, selected.aspect, runtime.display.fit), uniforms = surface.material.uniforms;
        uniforms.uMedia.value = selected.texture; uniforms.uScale.value.set(scale.x, scale.y);
        uniforms.uOffset.value.set(settings.offset / 100, settings.vertical / 100);
        uniforms.uBrightness.value = settings.brightness / 58; uniforms.uSize.value = settings.pixel / 100;
        uniforms.uLed.value = settings.ledTexture / 100; uniforms.uGlow.value = settings.glow / 100;
      }
    }
    if (id === this.active) {
      this.bloom.strength = id === 'field' ? .06 + settings.glow / 1200 : selected ? .12 + settings.glow / 400 : .52 * settings.glow / 58;
      this.renderer.toneMappingExposure = selected ? 1.05 : 1.12;
    }
  }
  private applyCurrentMedia() {
    this.host.dataset.source = this.active === 'field' ? 'autonomous' : this.source; this.pointerLeave();
    for (const [id, runtime] of this.runtimes) this.applyMedia(runtime, id);
  }
  private prepareTexture<T extends THREE.Texture>(texture: T): T {
    texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = false;
    texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true; return texture;
  }
  setStoredMedia(media: StoredMedia | null) {
    this.uploadTexture?.dispose(); this.uploadTexture = null;
    if (media) { this.uploadTexture = this.prepareTexture(media.element instanceof HTMLVideoElement ? new THREE.VideoTexture(media.element) : new THREE.Texture(media.element)); this.uploadAspect = media.info.width / media.info.height; }
    if (this.source === 'default' || this.source === 'upload') this.source = media ? 'upload' : 'default';
    this.applyCurrentMedia();
  }
  setLiveCanvas(canvas: HTMLCanvasElement | null) {
    if (canvas && this.liveTexture?.image === canvas) return;
    this.liveTexture?.dispose(); this.liveTexture = canvas ? this.prepareTexture(new THREE.CanvasTexture(canvas)) : null; this.applyCurrentMedia();
  }
  setFluidVideo(video: HTMLVideoElement | null) {
    if (video && this.fluidTexture?.image === video) return;
    this.fluidTexture?.dispose(); this.fluidTexture = video ? this.prepareTexture(new THREE.VideoTexture(video)) : null; this.applyCurrentMedia();
  }
  setParticleMedia(media: FieldMedia | null) {
    if (media === this.particleMedia) return;
    this.particleTexture?.dispose(); this.particleMedia = media;
    this.particleTexture = media ? this.prepareTexture(media instanceof HTMLVideoElement ? new THREE.VideoTexture(media) : new THREE.CanvasTexture(media)) : null; this.applyCurrentMedia();
  }
  refreshParticleFrame() { if (this.particleTexture instanceof THREE.CanvasTexture) this.particleTexture.needsUpdate = true; }
  setLiveSource(source: 'chroma' | 'fluid' | 'particles' | null) { this.source = source ?? (this.uploadTexture ? 'upload' : 'default'); this.applyCurrentMedia(); }
  setDisplay(id: NightSceneId, settings: DisplaySettings) { this.settings.set(id, { ...settings }); const runtime = this.runtimes.get(id); if (runtime) this.applyMedia(runtime, id); }
  setParticleInteraction(enabled: boolean) { this.interaction = enabled; this.controls.enabled = this.active === 'field' || !enabled; if (!enabled) this.pointerLeave(); }

  private pointerMove = (event: PointerEvent) => {
    if (this.active === 'field' || !this.interaction || this.source !== 'particles') return;
    const runtime = this.runtimes.get(this.active), selected = this.selectedMedia();
    if (!runtime || !selected) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    runtime.native.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), this.camera);
    const hits = this.raycaster.intersectObject(runtime.native.scene, true);
    // Skip the transparent ground overlay and glass, but respect solid architecture.
    const hit = hits.find(h => {
      if (!(h.object instanceof THREE.Mesh)) return false;
      const materials = Array.isArray(h.object.material) ? h.object.material : [h.object.material];
      return materials.some(m => m.visible && (!m.transparent || m.opacity >= .8));
    });
    let surfacePoint: { u: number; v: number } | null = null;
    if (hit?.uv) {
      const surface = runtime.display.surfaces.find(s => s.mesh === hit.object);
      if (surface && hit.face) {
        const mask = surface.geometry.attributes.mediaMask;
        if (mask.getX(hit.face.a) > .99 && mask.getX(hit.face.b) > .99 && mask.getX(hit.face.c) > .99) surfacePoint = { u: hit.uv.x, v: hit.uv.y };
      }
    }
    const point = surfacePoint && mapMediaPoint(surfacePoint.u, surfacePoint.v, runtime.display.aspect, selected.aspect, this.settings.get(this.active)!, runtime.display.fit);
    if (!point) { this.pointerLeave(); return; }
    this.host.dataset.pointerUv = `${point.u.toFixed(3)},${point.v.toFixed(3)}`;
    this.onPointer?.({ ...point, held: event.buttons !== 0, scatter: event.buttons === 2 });
  };
  private pointerDown = (event: PointerEvent) => { if (this.interaction) { this.renderer.domElement.setPointerCapture(event.pointerId); this.pointerMove(event); } };
  private pointerLeave = () => { delete this.host.dataset.pointerUv; this.onPointer?.(null); };
  private contextMenu = (event: MouseEvent) => { if (this.interaction) event.preventDefault(); };

  setView(view: 'front' | 'side' | 'high') {
    const runtime = this.runtimes.get(this.active); if (!runtime) return;
    const target = runtime.native.target, distance = runtime.native.cameraPosition.distanceTo(target);
    const direction = view === 'front' ? new THREE.Vector3(0, .12, 1) : view === 'side' ? new THREE.Vector3(1, .2, .1) : new THREE.Vector3(.35, 1, .65);
    this.controls.target.copy(target); this.camera.position.copy(target).addScaledVector(direction.normalize(), distance); this.controls.update();
  }
  resetView() { const runtime = this.runtimes.get(this.active); if (!runtime) return; this.camera.position.copy(runtime.native.cameraPosition); this.controls.target.copy(runtime.native.target); this.controls.update(); }
  exportPng() {
    this.composer.render(); const link = document.createElement('a'); link.href = this.renderer.domElement.toDataURL('image/png');
    link.download = `${this.active}-studio-${new Date().toISOString().slice(0, 10)}.png`; link.click();
  }

  private disposeNative(native: NativeNightScene, display?: NightSurfaces) {
    if (this.disposedScenes.has(native)) return;
    this.disposedScenes.add(native); this.ownedScenes.delete(native);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    native.scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
        geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
        if (object instanceof THREE.BatchedMesh || object instanceof THREE.InstancedMesh) object.dispose();
      }
      if (object instanceof THREE.Light && 'shadow' in object) (object as THREE.DirectionalLight).shadow?.dispose();
      if ('getRenderTarget' in object && typeof object.getRenderTarget === 'function') object.getRenderTarget().dispose();
    });
    for (const surface of display?.surfaces ?? []) {
      geometries.add(surface.geometry); geometries.add(surface.nativeGeometry); materials.add(surface.material);
      (Array.isArray(surface.nativeMaterial) ? surface.nativeMaterial : [surface.nativeMaterial]).forEach(m => materials.add(m));
    }
    const retired = native.scene.userData.retiredResources as { geometries: Set<THREE.BufferGeometry>; materials: Set<THREE.Material> } | undefined;
    retired?.geometries.forEach(g => geometries.add(g)); retired?.materials.forEach(m => materials.add(m));
    for (const material of materials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); native.dispose?.();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; ++this.switchVersion; cancelAnimationFrame(this.frame); this.observer.disconnect(); this.pointerLeave();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.pointerMove); canvas.removeEventListener('pointerdown', this.pointerDown);
    for (const event of ['pointerup', 'pointercancel', 'pointerleave']) canvas.removeEventListener(event, this.pointerLeave);
    canvas.removeEventListener('contextmenu', this.contextMenu);
    this.controls.dispose();
    for (const runtime of this.runtimes.values()) this.disposeNative(runtime.native, runtime.display);
    for (const native of this.ownedScenes) this.disposeNative(native);
    this.runtimes.clear();
    for (const texture of [this.uploadTexture, this.liveTexture, this.fluidTexture, this.particleTexture]) texture?.dispose();
    for (const pass of this.composer.passes) pass.dispose();
    this.composer.dispose(); this.renderer.dispose();
    // WebGLState's fallback textures belong to the context, not the scene.
    // This canvas is never reused after unmount; release its context as well.
    this.renderer.forceContextLoss(); canvas.remove();
  }
}
