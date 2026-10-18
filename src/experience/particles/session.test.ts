import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fieldIsActive, ParticleFieldSession, projectControl } from './session';

const fake = vi.hoisted(() => {
  const instances: FakeEngine[] = [];
  const options = { failGPU: false, initGate: null as Promise<void> | null };
  class FakeEngine {
    paused = false; reducedMotion = false; pointer = { x: 0, y: 0, down: false, inside: false, power: 0 };
    frameHandle: number | null = null; time = 17; frames = 1020; destroyed = false;
    preset = 'classic'; control = { x: 0, y: 0 };
    constructor(public canvas: HTMLCanvasElement) { instances.push(this); }
    setPreset(value: string) { this.preset = value; }
    setAppearance() {} setInteractionSpeed() {}
    setControl(x: number, y: number) { this.control = { x, y }; }
    setPaused(value: boolean) { this.paused = value; value ? this.suspend() : this.resume(); }
    suspend() { this.frameHandle = null; }
    resume() { if (!this.paused && !this.destroyed) this.frameHandle = 1; }
    reset() { this.time = 0; this.frames = 0; this.control = { x: 0, y: 0 }; }
    destroy() { this.destroyed = true; this.suspend(); }
    snapshot() { return { time: this.time, frames: this.frames, control: this.control }; }
    async init() { if (options.initGate) await options.initGate; if (options.failGPU) throw new Error('device unavailable'); }
  }
  return { FakeEngine, instances, options };
});
vi.mock('./core/classic-effect.js', () => ({ ClassicEffect: fake.FakeEngine }));
vi.mock('./core/flow-engine.js', () => ({ FlowEngine: fake.FakeEngine }));
vi.mock('./core/gpu-field-engine.js', () => ({ GPUFieldEngine: fake.FakeEngine }));

describe('shared Particle Field session', () => {
  let session: ParticleFieldSession;
  beforeEach(() => {
    fake.instances.length = 0; fake.options.failGPU = false; fake.options.initGate = null;
    vi.stubGlobal('document', { hidden: false, createElement: () => ({ setAttribute() {} }) });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { gpu: {} });
    vi.stubGlobal('HTMLVideoElement', class {});
    session = new ParticleFieldSession();
  });
  afterEach(() => { session.dispose(); vi.unstubAllGlobals(); });

  it('constrains diagonal pad input to the unit circle', () => {
    expect(projectControl(.2, -.4)).toEqual({ x: .2, y: -.4 });
    const control = projectControl(3, 4);
    expect(control).toEqual({ x: .6, y: .8 });
  });
  it('runs only for a visible particle view or a selected building source', () => {
    expect(fieldIsActive('particles', 'stored', true)).toBe(true);
    for (const mode of ['photo', 'lightform']) {
      expect(fieldIsActive(mode, 'particles', true)).toBe(true);
      expect(fieldIsActive(mode, 'fluid', true)).toBe(false);
      expect(fieldIsActive(mode, 'particles', false)).toBe(false);
    }
    expect(fieldIsActive('chroma', 'particles', true)).toBe(false);
  });
  it('starts lazily in Classic without creating GPU resources', async () => {
    expect(fake.instances).toHaveLength(0);
    session.setEnvironment(true, false); await session.ensure();
    expect(fake.instances).toHaveLength(1);
    expect(session.getSnapshot()).toMatchObject({ preset: 'classic', backend: 'canvas2d', loading: false });
    expect(session.diagnostics()).toMatchObject({ bridgeCount: 0, loopCount: 1 });
  });
  it('keeps the same canvas, time, controls and instance across view suspension', async () => {
    session.setEnvironment(true, false); await session.ensure();
    session.update({ control: { x: .6, y: .8 }, paused: true });
    const canvas = session.getCanvas(), before = session.diagnostics();
    session.setEnvironment(false, false); session.setEnvironment(true, false); await session.ensure();
    expect(session.getCanvas()).toBe(canvas);
    expect(fake.instances).toHaveLength(1);
    expect(session.diagnostics()).toMatchObject({ time: before.time, frames: before.frames, loopCount: 0 });
    expect(session.getSnapshot().control).toEqual({ x: .6, y: .8 });
    session.reset(); expect(session.diagnostics().time).toBe(0);
  });
  it('falls back to the same enhanced preset and resumes the existing Canvas engine', async () => {
    session.selectPreset('aurora'); session.setEnvironment(true, false); await session.ensure();
    const canvas = session.getCanvas();
    fake.options.failGPU = true; session.selectBackend('webgpu'); await session.ensure();
    await vi.waitFor(() => expect(session.getSnapshot()).toMatchObject({ backend: 'canvas2d', preset: 'aurora', loading: false }));
    expect(session.getCanvas()).toBe(canvas);
    expect(session.diagnostics().loopCount).toBe(1);
    expect(session.getSnapshot().error).toContain('GPU fallback');
  });
  it('discards late GPU initialization after disposal and destroys its resources', async () => {
    session.selectPreset('drift'); session.setEnvironment(true, false); await session.ensure();
    let finish = () => {};
    fake.options.initGate = new Promise<void>(resolve => { finish = resolve; });
    session.selectBackend('webgpu');
    await vi.waitFor(() => expect(fake.instances).toHaveLength(2));
    session.dispose(); finish(); await session.ensure();
    await vi.waitFor(() => expect(fake.instances.every(engine => engine.destroyed)).toBe(true));
    expect(session.getSnapshot().media).toBeNull();
    expect(session.diagnostics()).toMatchObject({ loopCount: 0, bridgeCount: 0 });
  });
  it('defaults to a still frame for reduced motion and releases all engines on exit', async () => {
    session.setEnvironment(true, true); await session.ensure();
    expect(session.getSnapshot().paused).toBe(true);
    expect(session.diagnostics().loopCount).toBe(0);
    session.dispose(); expect(fake.instances.every(engine => engine.destroyed)).toBe(true);
  });
});
