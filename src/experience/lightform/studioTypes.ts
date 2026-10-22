import type { FieldMedia } from '../particles/types';
import type { ColumnPreset } from './columnLighting';
export type SceneId = 'sphere' | 'collins' | 'facade';
export type NightSceneId = 'dome' | 'fluid' | 'field';
export type DisplaySettings = {
  brightness: number; pixel: number; ledTexture: number; dotGap: number;
  offset: number; glow: number; vertical: number;
};
export type MediaInfo = {
  name: string; kind: 'demo' | 'image' | 'video' | 'chroma' | 'fluid' | 'particles';
  width: number; height: number; duration: number; previewUrl: string | null;
};
export type StoredMedia = { info: MediaInfo; element: HTMLImageElement | HTMLVideoElement; url: string };
export type StudioPointer = { u: number; v: number; held: boolean; scatter: boolean };
export interface StudioRenderer<S extends string = SceneId> {
  setScene(id: S): Promise<void>;
  setStoredMedia(media: StoredMedia | null): void;
  setLiveCanvas(canvas: HTMLCanvasElement | null): void;
  setParticleMedia(media: FieldMedia | null, playing?: boolean): void;
  refreshParticleFrame(): void;
  setParticleInteraction?(enabled: boolean): void;
  setFluidVideo(video: HTMLVideoElement | null): void;
  setLiveSource(source: 'chroma' | 'fluid' | 'particles' | null): void;
  setDisplay(id: S, settings: DisplaySettings): void;
  setView(view: 'front' | 'side' | 'high'): void;
  resetView(): void;
  setColumnPreset?(preset: ColumnPreset): void;
  exportPng(): void;
  dispose(): void;
}
export type StudioFactory<S extends string = SceneId> = (host: HTMLElement, onReady: () => void, onError: (message: string) => void,
  onPointer?: (pointer: StudioPointer | null) => void) => StudioRenderer<S>;
export type StudioScene<S extends string> = { id: S; name: string; label: string; media: MediaInfo; settings: DisplaySettings;
  controls: 'strips' | 'dots' | 'sphere' | 'columns'; caption: string; note: string; independent?: boolean; referenceView?: boolean };
export type StudioConfig<S extends string> = { initial: S; scenes: readonly StudioScene<S>[] };
export const DEFAULT_SETTINGS: Record<SceneId, DisplaySettings> = {
  sphere: { brightness: 58, pixel: 60, ledTexture: 100, dotGap: 45, offset: 0, glow: 55, vertical: 0 },
  collins: { brightness: 58, pixel: 60, ledTexture: 100, dotGap: 42, offset: 0, glow: 45, vertical: 0 },
  facade: { brightness: 58, pixel: 55, ledTexture: 100, dotGap: 40, offset: 0, glow: 58, vertical: 0 },
};
