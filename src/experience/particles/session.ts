import { useSyncExternalStore } from 'react';
import type { FieldBackend, FieldEngine, FieldMedia, FieldPreset, FieldSettings, FieldSnapshot, FieldViewport } from './types';

export const INITIAL_FIELD: FieldSnapshot = {
  preset: 'classic', backend: 'canvas2d', theme: 'dark', monochrome: false,
  paused: false, control: { x: 0, y: 0 }, interactionSpeed: .45,
  media: null, loading: false, error: '', revision: 0,
};
export function projectControl(x: number, y: number) {
  const length = Math.max(1, Math.hypot(x, y));
  return { x: x / length, y: y / length };
}
export function fieldIsActive(mode: string, source: string, visible: boolean) {
  return visible && (mode === 'particles' || ((mode === 'lightform' || mode === 'photo') && source === 'particles'));
}

/** Owns the simulation across React view changes. Views borrow the canvas;
 * only this session can stop tracks, destroy engines, or reset the artwork. */
export class ParticleFieldSession {
  private state: FieldSnapshot = INITIAL_FIELD;
  private listeners = new Set<() => void>();
  private engines = new Map<string, FieldEngine>();
  private current: FieldEngine | null = null;
  private viewport: FieldViewport | null = null;
  private active = false;
  private reduced = false;
  private disposed = false;
  private generation = 0;
  private inFlight: Promise<void> | null = null;
  private gpuDisabled = false;
  private bridges = new Map<FieldEngine, { video: HTMLVideoElement; stream: MediaStream; cancel: () => void }>();
  private frameListeners = new Set<() => void>();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  getServerSnapshot = () => INITIAL_FIELD;
  getCanvas = () => this.current?.canvas ?? null;
  subscribeFrame = (listener: () => void) => { this.frameListeners.add(listener); return () => { this.frameListeners.delete(listener); }; };
  private publish(patch: Partial<FieldSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private invalidate() {
    this.publish({ revision: this.state.revision + 1 });
    this.frameListeners.forEach(listener => listener());
  }
  setEnvironment(active: boolean, reduced: boolean) {
    this.disposed = false;
    this.active = active;
    if (reduced && !this.reduced) this.publish({ paused: true });
    this.reduced = reduced;
    if (active) void this.ensure();
    this.syncPlaying();
  }
  private syncPlaying() {
    for (const engine of this.engines.values()) {
      engine.reducedMotion = this.reduced;
      engine.setPaused(this.state.paused);
      if (engine !== this.current || !this.active || document.hidden) engine.suspend();
      else if (!this.state.paused) engine.resume();
    }
  }
  private apply(engine: FieldEngine) {
    engine.setPreset?.(this.state.preset);
    engine.setAppearance(this.state.theme, this.state.monochrome);
    engine.setInteractionSpeed?.(this.state.interactionSpeed);
    engine.setControl(this.state.control.x, this.state.control.y);
    engine.setPaused(this.state.paused);
  }
  private key() { return this.state.preset === 'classic' ? 'classic' : this.state.backend; }
  async ensure() {
    if (this.disposed || !this.active) return;
    if (this.state.error === 'Canvas unavailable') return;
    if (this.current === this.engines.get(this.key())) return;
    if (this.inFlight) return this.inFlight;
    const version = this.generation;
    const key = this.key();
    this.publish({ loading: true });
    this.inFlight = this.startEngine(key, version).finally(() => {
      this.inFlight = null;
      if (!this.disposed && this.active && this.current !== this.engines.get(this.key())) void this.ensure();
    });
    return this.inFlight;
  }
  private async startEngine(key: string, version: number) {
    let engine = this.engines.get(key);
    try {
      if (!this.viewport) {
        const mobile = window.matchMedia('(max-width: 600px)').matches;
        this.viewport = { width: mobile ? 768 : 1280, height: mobile ? 432 : 720, mobile };
      }
      if (!engine) {
        const canvas = document.createElement('canvas');
        canvas.className = 'particle-field-canvas';
        canvas.setAttribute('aria-label', 'Particle Field live artwork');
        const options = { viewport: this.viewport, reducedMotion: this.reduced, onFailure: (error: Error) => this.gpuFailed(error) };
        if (key === 'classic') {
          const { ClassicEffect } = await import('./core/classic-effect.js');
          if (this.disposed || version !== this.generation) return;
          engine = new ClassicEffect(canvas, options);
        } else if (key === 'canvas2d') {
          const { FlowEngine } = await import('./core/flow-engine.js');
          if (this.disposed || version !== this.generation) return;
          engine = new FlowEngine(canvas, options);
        } else {
          if (this.gpuDisabled || !navigator.gpu) throw new Error('WebGPU unavailable');
          const { GPUFieldEngine } = await import('./core/gpu-field-engine.js');
          if (this.disposed || version !== this.generation) return;
          const gpu = new GPUFieldEngine(canvas, options);
          engine = gpu;
          await gpu.init();
        }
        if (this.disposed || version !== this.generation) { engine.destroy(); return; }
        this.engines.set(key, engine);
      }
      this.apply(engine);
      engine.suspend();
      // A GPU canvas cannot be sampled reliably by the WebGL compositors.
      // Retain the previous output until the captured video has a valid frame.
      let media: FieldMedia = engine.canvas;
      if (key === 'webgpu') media = await this.bridge(engine);
      if (this.disposed || version !== this.generation || key !== this.key()) { engine.suspend(); return; }
      this.current?.suspend();
      this.current = engine;
      this.publish({ media, loading: false });
      this.invalidate();
      this.syncPlaying();
    } catch (cause) {
      if (this.disposed || version !== this.generation) { engine?.destroy(); return; }
      if (engine) { this.releaseBridge(engine); engine.destroy(); }
      this.engines.delete(key);
      if (key === 'webgpu') this.gpuFailed(cause);
      else this.publish({ loading: false, error: 'Canvas unavailable' });
    }
  }
  private async bridge(engine: FieldEngine) {
    const existing = this.bridges.get(engine);
    if (existing) return existing.video;
    if (!engine.canvas.captureStream) throw new Error('Canvas capture unavailable');
    const stream = engine.canvas.captureStream(30);
    const track = stream.getVideoTracks()[0];
    if (!track) { stream.getTracks().forEach(item => item.stop()); throw new Error('No video track'); }
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.srcObject = stream;
    let cancel = () => {};
    this.bridges.set(engine, { video, stream, cancel: () => cancel() });
    const ready = new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer); video.removeEventListener('loadeddata', loaded); video.removeEventListener('error', failed);
        error ? reject(error) : resolve();
      };
      const loaded = () => finish();
      const failed = () => finish(new Error('Video bridge failed'));
      const timer = window.setTimeout(() => finish(new Error('Video bridge timed out')), 8000);
      cancel = () => finish(new Error('Video bridge cancelled'));
      video.addEventListener('loadeddata', loaded, { once: true });
      video.addEventListener('error', failed, { once: true });
    });
    // Capture a real frame without advancing simulation, including paused starts.
    this.apply(engine);
    engine.suspend();
    (track as MediaStreamTrack & { requestFrame?: () => void }).requestFrame?.();
    await Promise.all([video.play(), ready]);
    track.addEventListener('ended', () => { if (!this.disposed && this.current === engine) this.gpuFailed(new Error('Video track ended')); }, { once: true });
    return video;
  }
  private releaseBridge(engine: FieldEngine) {
    const bridge = this.bridges.get(engine);
    if (!bridge) return;
    this.bridges.delete(engine); bridge.cancel();
    bridge.stream.getTracks().forEach(track => track.stop());
    bridge.video.pause(); bridge.video.srcObject = null;
  }
  private gpuFailed(cause: unknown) {
    if (this.disposed) return;
    this.gpuDisabled = true;
    const gpu = this.engines.get('webgpu');
    if (gpu) { this.releaseBridge(gpu); gpu.destroy(); this.engines.delete('webgpu'); if (this.current === gpu) this.current = null; }
    this.publish({ backend: 'canvas2d', loading: false, error: `GPU fallback: ${cause instanceof Error ? cause.message : 'WebGPU unavailable'}` });
    void this.ensure();
    this.syncPlaying();
  }
  update(patch: Partial<FieldSettings>) {
    const previousKey = this.key();
    const next = { ...patch };
    if (next.control) next.control = projectControl(next.control.x, next.control.y);
    if (next.interactionSpeed !== undefined) next.interactionSpeed = Math.max(.1, Math.min(1.5, next.interactionSpeed));
    if (next.preset === 'classic') next.backend = 'canvas2d';
    if (next.backend === 'webgpu' && (this.state.preset === 'classic' && !next.preset)) return;
    this.publish(next);
    if (this.key() !== previousKey) {
      this.current?.suspend(); void this.ensure();
    } else if (this.current) {
      // Applying only the changed property preserves trails and particle momentum.
      if (next.preset !== undefined) this.current.setPreset?.(next.preset);
      if (next.theme !== undefined || next.monochrome !== undefined) this.current.setAppearance(this.state.theme, this.state.monochrome);
      if (next.interactionSpeed !== undefined) this.current.setInteractionSpeed?.(next.interactionSpeed);
      if (next.control !== undefined) this.current.setControl(next.control.x, next.control.y);
      this.syncPlaying();
    }
    this.invalidate();
  }
  selectPreset(preset: FieldPreset) { this.update({ preset }); }
  selectBackend(backend: FieldBackend) {
    if (backend === 'webgpu') this.gpuDisabled = false;
    this.publish({ error: '' }); this.update({ backend });
  }
  setPointer(u: number, v: number, down: boolean, inside = true) {
    if (!this.active || document.hidden || !this.current || this.state.preset === 'classic' || !this.viewport) return;
    Object.assign(this.current.pointer, { x: u * this.viewport.width, y: v * this.viewport.height, down, inside });
  }
  reset() {
    this.publish({ control: { x: 0, y: 0 } }); this.current?.reset(); this.syncPlaying(); this.invalidate();
  }
  clearError() { this.publish({ error: '' }); }
  diagnostics = () => ({ ...this.current?.snapshot(), preset: this.state.preset, backend: this.state.backend,
    time: this.current?.time ?? 0, frames: this.current?.frames ?? 0,
    instance: this.current ? [...this.engines.values()].indexOf(this.current) : -1,
    active: this.active, generation: this.generation, loading: this.state.loading,
    loopCount: [...this.engines.values()].filter(engine => engine.frameHandle !== null).length,
    bridgeCount: this.bridges.size, source: this.state.media instanceof HTMLVideoElement ? 'video' : 'canvas' });
  dispose() {
    this.disposed = true; this.active = false; ++this.generation;
    for (const engine of this.engines.values()) { this.releaseBridge(engine); engine.destroy(); }
    this.engines.clear(); this.current = null;
    this.publish({ media: null, loading: false });
  }
}
export function useParticleField(session: ParticleFieldSession) {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
}
