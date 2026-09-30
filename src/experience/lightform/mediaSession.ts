import { useSyncExternalStore } from 'react';
import type { MediaInfo, StoredMedia } from './studioTypes';

export type MediaSource = 'stored' | 'chroma' | 'fluid';
type Snapshot = { media: StoredMedia | null; source: MediaSource; playing: boolean; time: number };
const empty: Snapshot = { media: null, source: 'stored', playing: false, time: 0 };

/** Owns local files and decoding elements for the lifetime of the Lab page.
 * Renderers borrow the element; only this session revokes URLs or unloads it. */
export class LabMediaSession {
  private snapshot: Snapshot = empty;
  private listeners = new Set<() => void>();
  private version = 0;
  private active = true;
  private resume = false;
  private detachVideo: (() => void) | null = null;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => empty;
  private publish(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  getVideo() { return this.snapshot.media?.element instanceof HTMLVideoElement ? this.snapshot.media.element : null; }
  private release(media: StoredMedia | null) {
    if (!media) return;
    if (media.element instanceof HTMLVideoElement) {
      media.element.pause(); media.element.removeAttribute('src'); media.element.load();
    }
    URL.revokeObjectURL(media.url);
  }
  async load(file: File): Promise<MediaInfo> {
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type)) {
      throw new Error('请选择 JPG、PNG、WebP、MP4 或 WebM 文件。视频还需由当前浏览器支持解码。');
    }
    const version = ++this.version;
    const url = URL.createObjectURL(file);
    const video = file.type.startsWith('video/') ? document.createElement('video') : null;
    const element = video ?? new Image();
    let committed = false;
    try {
      if (video) { video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'auto'; }
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => finish(new Error('媒体加载超时，请重试。')), 15000);
        const finish = (error?: Error) => {
          window.clearTimeout(timer); element.onload = null; element.onerror = null;
          if (video) video.onloadeddata = null;
          error ? reject(error) : resolve();
        };
        element.onerror = () => finish(new Error(video ? '浏览器无法解码此视频。' : '媒体加载失败。'));
        if (video) video.onloadeddata = () => finish(); else element.onload = () => finish();
        element.src = url;
        if (video) video.load();
      });
      const image = element as HTMLImageElement;
      const width = video ? video.videoWidth : image.naturalWidth;
      const height = video ? video.videoHeight : image.naturalHeight;
      if (!width || !height) throw new Error('文件没有有效的画面尺寸。');
      if (version !== this.version) throw new Error('上传已被新的文件替代。');
      const info: MediaInfo = { name: file.name, kind: video ? 'video' : 'image', width, height,
        duration: video && Number.isFinite(video.duration) ? video.duration : 0, previewUrl: url };
      const previous = this.snapshot.media;
      this.detachVideo?.(); this.detachVideo = null;
      this.resume = !!video;
      this.publish({ media: { info, element, url }, source: 'stored', time: 0, playing: false });
      committed = true;
      this.release(previous);
      if (video) {
        const sync = () => this.publish({ playing: !video.paused, time: video.currentTime });
        for (const event of ['timeupdate', 'play', 'pause', 'seeked']) video.addEventListener(event, sync);
        this.detachVideo = () => { for (const event of ['timeupdate', 'play', 'pause', 'seeked']) video.removeEventListener(event, sync); };
        if (this.active) await video.play().catch(() => undefined);
      }
      return info;
    } finally {
      if (!committed) this.release({ info: { name: '', kind: video ? 'video' : 'image', width: 0, height: 0, duration: 0, previewUrl: url }, element, url });
    }
  }
  setSource(source: MediaSource) {
    if (source === this.snapshot.source) return;
    const video = this.getVideo();
    if (video && this.snapshot.source === 'stored') { this.resume = !video.paused; video.pause(); }
    this.publish({ source });
    if (source === 'stored' && video && this.resume && this.active) void video.play().catch(() => undefined);
  }
  setActive(active: boolean) {
    if (active === this.active) return;
    this.active = active;
    const video = this.getVideo();
    if (!video || this.snapshot.source !== 'stored') return;
    if (!active) { this.resume = !video.paused; video.pause(); }
    else if (this.resume) void video.play().catch(() => undefined);
  }
  async togglePlayback() {
    const video = this.getVideo();
    if (!video) return;
    if (video.paused) { await video.play(); this.resume = true; }
    else { this.resume = false; video.pause(); }
  }
  seek(time: number) {
    const video = this.getVideo();
    if (video && Number.isFinite(video.duration)) { video.currentTime = Math.max(0, Math.min(video.duration, time)); this.publish({ time: video.currentTime }); }
  }
  reset() {
    ++this.version;
    this.detachVideo?.(); this.detachVideo = null;
    const previous = this.snapshot.media;
    this.publish(empty); this.resume = false; this.release(previous);
  }
  dispose() { this.reset(); }
}
export function useMediaSession(session: LabMediaSession) {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
}
