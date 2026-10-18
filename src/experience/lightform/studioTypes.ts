export type SceneId = 'sphere' | 'collins' | 'facade';
export type DisplaySettings = {
  brightness: number; pixel: number; ledTexture: number; dotGap: number;
  offset: number; glow: number; vertical: number;
};
export type MediaInfo = {
  name: string; kind: 'demo' | 'image' | 'video' | 'chroma' | 'fluid';
  width: number; height: number; duration: number; previewUrl: string | null;
};
export type StoredMedia = { info: MediaInfo; element: HTMLImageElement | HTMLVideoElement; url: string };
export type StudioPointer = { u: number; v: number; held: boolean; scatter: boolean };
export interface StudioRenderer {
  setScene(id: SceneId): Promise<void>;
  setStoredMedia(media: StoredMedia | null): void;
  setLiveCanvas(canvas: HTMLCanvasElement | null): void;
  setFluidVideo(video: HTMLVideoElement | null): void;
  setLiveSource(source: 'chroma' | 'fluid' | null): void;
  setDisplay(id: SceneId, settings: DisplaySettings): void;
  setView(view: 'front' | 'side' | 'high'): void;
  resetView(): void;
  exportPng(): void;
  dispose(): void;
}
export type StudioFactory = (host: HTMLElement, onReady: () => void, onError: (message: string) => void,
  onPointer?: (pointer: StudioPointer | null) => void) => StudioRenderer;
export const DEFAULT_SETTINGS: Record<SceneId, DisplaySettings> = {
  sphere: { brightness: 58, pixel: 60, ledTexture: 100, dotGap: 45, offset: 0, glow: 55, vertical: 0 },
  collins: { brightness: 58, pixel: 60, ledTexture: 100, dotGap: 42, offset: 0, glow: 45, vertical: 0 },
  facade: { brightness: 58, pixel: 55, ledTexture: 100, dotGap: 40, offset: 0, glow: 58, vertical: 0 },
};
