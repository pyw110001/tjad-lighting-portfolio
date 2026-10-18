import type { DisplaySettings } from './studioTypes';

export type MediaFit = 'contain' | 'stretch';
export function mediaTransform(surfaceAspect: number, mediaAspect: number, fit: MediaFit = 'contain') {
  return fit === 'stretch' ? { x: 1, y: 1 } : containTransform(surfaceAspect, mediaAspect);
}

/** Shared front/back UVs: viewed from the rear, the front image reads as a mirror. */
export function mirroredHemisphereU(longitude: number) {
  return .5 + Math.asin(Math.sin((longitude - .5) * Math.PI * 2)) / Math.PI;
}

/** Both the shader and pointer use top-left coordinates. Outside = letterbox. */
export function containTransform(surfaceAspect: number, mediaAspect: number) {
  const ratio = surfaceAspect / mediaAspect;
  return { x: Math.max(1, ratio), y: Math.max(1, 1 / ratio) };
}
export function mapMediaPoint(u: number, v: number, surfaceAspect: number, mediaAspect: number,
  settings: Pick<DisplaySettings, 'offset' | 'vertical'>, fit: MediaFit = 'contain') {
  const scale = mediaTransform(surfaceAspect, mediaAspect, fit);
  u = .5 + (u - .5) * scale.x - settings.offset / 100;
  v = .5 + (v - .5) * scale.y - settings.vertical / 100;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v } : null;
}
