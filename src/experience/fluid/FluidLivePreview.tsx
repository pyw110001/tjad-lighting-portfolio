import { useEffect, useRef, type PointerEvent } from 'react';
import { WebGPUFluidEngine } from './WebGPUFluidEngine';
import type { FluidLightState } from '../labState';

interface Props {
  settings: FluidLightState;
  onReady: (video: HTMLVideoElement) => void;
  onError: () => void;
  onRelease: (video: HTMLVideoElement) => void;
  onPointerReady?: (handle: FluidPointerHandle | null) => void;
  highResolution?: boolean;
}
export type FluidPointerHandle = { setPointer: (u: number, v: number, active: boolean, scatter: boolean) => void };

/** A fixed size WebGPU source. captureStream is needed because WebGL cannot
 * reliably sample a WebGPU canvas directly as a CanvasTexture. */
export default function FluidLivePreview({ settings, onReady, onError, onRelease, onPointerReady, highResolution = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGPUFluidEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !WebGPUFluidEngine.isSupported() || !canvas.captureStream) { onError(); return; }
    const engine = new WebGPUFluidEngine({ palette: settings.palette, customColors: settings.customColors, particleCount: settings.particleCount, gravity: settings.gravity, viscosityStrength: settings.viscosity, particleRadius: settings.particleRadius });
    engineRef.current = engine;
    onPointerReady?.({ setPointer: (u, v, active, scatter) => engine.setNormalizedPointer(u, v, active, scatter) });
    let alive = true;
    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    let readyTimer = 0;
    const syncVisibility = () => { if (document.hidden) engine.stop(); else if (!engine.isPaused) engine.start(); };
    document.addEventListener('visibilitychange', syncVisibility);
    void (async () => {
      try {
        await engine.init(canvas);
        if (!alive) return;
        // The first rendered frame lets the video track deliver loadeddata, including for paused artwork.
        engine.start();
        stream = canvas.captureStream(24);
        if (!stream.getVideoTracks().length) throw new Error('No canvas video track');
        stream.getVideoTracks()[0].addEventListener('ended', () => { if (alive) onError(); }, { once: true });
        video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.srcObject = stream;
        const ready = new Promise<void>((resolve, reject) => {
          if (video!.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) { resolve(); return; }
          video!.addEventListener('loadeddata', () => resolve(), { once: true });
          video!.addEventListener('error', () => reject(new Error('Video stream failed')), { once: true });
          readyTimer = window.setTimeout(() => reject(new Error('Video stream timed out')), 8000);
        });
        await video.play();
        await ready;
        window.clearTimeout(readyTimer);
        if (!alive) return;
        if (settings.paused) { engine.pause(); engine.stop(); }
        onReady(video);
      } catch {
        if (alive) onError();
      }
    })();
    return () => {
      alive = false;
      window.clearTimeout(readyTimer);
      document.removeEventListener('visibilitychange', syncVisibility);
      if (video) { onRelease(video); video.pause(); video.srcObject = null; }
      stream?.getTracks().forEach(track => track.stop());
      engine.destroy();
      onPointerReady?.(null);
      if (engineRef.current === engine) engineRef.current = null;
    };
    // One simulation is owned by the selected Fluid source, not by the active scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    const world = engine.screenToWorld(event.clientX, event.clientY);
    engine.setPointer(world.x, world.y, event.buttons !== 0, event.buttons & 2 ? -1.2 : 1);
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => { event.currentTarget.setPointerCapture(event.pointerId); move(event); };
  const up = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    engineRef.current?.setPointer(0, 0, false);
  };
  return <canvas ref={canvasRef} className="fluid-live-canvas" width={highResolution ? 1920 : 960} height={highResolution ? 1080 : 540} onPointerMove={move} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={() => engineRef.current?.setPointer(0, 0, false)} onContextMenu={event => event.preventDefault()} aria-label="Fluid Live interactive canvas" />;
}
