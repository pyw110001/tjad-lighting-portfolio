export type FieldPreset = 'drift' | 'vortex' | 'aurora' | 'orbit' | 'classic';
export type FieldBackend = 'canvas2d' | 'webgpu';
export type FieldMedia = HTMLCanvasElement | HTMLVideoElement;
export interface FieldSettings {
  preset: FieldPreset;
  backend: FieldBackend;
  theme: 'dark' | 'light';
  monochrome: boolean;
  paused: boolean;
  control: { x: number; y: number };
  interactionSpeed: number;
}
export interface FieldSnapshot extends FieldSettings {
  media: FieldMedia | null;
  loading: boolean;
  error: string;
  revision: number;
}
export interface FieldViewport { width: number; height: number; mobile: boolean }
export interface FieldEngine {
  canvas: HTMLCanvasElement;
  paused: boolean;
  reducedMotion: boolean;
  ready?: boolean;
  pointer: { x: number; y: number; down: boolean; inside: boolean; power: number };
  frameHandle: number | null;
  time: number;
  frames: number;
  setPreset?(preset: FieldPreset): void;
  setAppearance(theme: 'dark' | 'light', monochrome: boolean): void;
  setControl(x: number, y: number): void;
  setInteractionSpeed?(value: number): void;
  setPaused(value: boolean): void;
  suspend(): void;
  resume(): void;
  reset(resetControl?: boolean): void;
  destroy(): void;
  snapshot(): Record<string, unknown>;
}
export interface EngineOptions {
  viewport: FieldViewport;
  reducedMotion: boolean;
  onFailure?: (error: Error) => void;
}
