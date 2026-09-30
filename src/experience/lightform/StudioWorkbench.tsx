import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight, ArrowUpDown, Camera, ChevronLeft, ChevronRight, CircleHelp,
  Eye, Image as ImageIcon, Layers3, Mouse, Pause, Play,
  RotateCcw, Sparkles, Upload, Video, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ParticleEngine } from '../chroma/particleEngine';
import type { FluidPointerHandle } from '../fluid/FluidLivePreview';
import type { ChromaSession } from '../chroma/session';
import type { FluidLightState } from '../labState';
import { DEFAULT_SETTINGS, type DisplaySettings, type MediaInfo, type SceneId, type StudioFactory, type StudioRenderer, type StudioPointer } from './studioTypes';
import { useMediaSession, type LabMediaSession, type MediaSource } from './mediaSession';
import './styles.css'
import { useLightformCopy } from './copy';
const FluidLivePreview = lazy(() => import('../fluid/FluidLivePreview'));
const fluidSupported = () => typeof navigator !== 'undefined' && !!navigator.gpu;

const DEFAULT_MEDIA: Record<SceneId, MediaInfo> = {
  sphere: { name: '球形展馆地球夜景', kind: 'demo', width: 0, height: 0, duration: 0, previewUrl: '/assets/light-lab/lightform/media/earth-night.png' },
  collins: { name: '街区塔楼灯带演示', kind: 'demo', width: 0, height: 0, duration: 0, previewUrl: '/assets/light-lab/lightform/media/vegas-night-panorama-v2.png' },
  facade: { name: '弧形展馆点阵演示', kind: 'demo', width: 0, height: 0, duration: 0, previewUrl: null },
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '00:00';
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
}

function Slider({ label, value, min, max, suffix, icon, onChange }: {
  label: string; value: number; min: number; max: number; suffix: string;
  icon: React.ReactNode; onChange: (value: number) => void;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  return <label className="slider-row">
    <span className="slider-heading"><span className="slider-name">{icon}{label}</span><output>{value}{suffix}</output></span>
    <input type="range" min={min} max={max} value={value}
      style={{ '--range-fill': `${percent}%` } as React.CSSProperties}
      onChange={(event) => onChange(Number(event.target.value))} aria-label={label} />
  </label>;
}

export default function StudioWorkbench({ chromaSession, fluidSettings, mediaSession, createStudio, photo = false }: {
  chromaSession: ChromaSession; fluidSettings: FluidLightState; mediaSession: LabMediaSession;
  createStudio: StudioFactory; photo?: boolean;
}) {
  const t = useLightformCopy()
  const navigate = useNavigate();
  const canvasHost = useRef<HTMLDivElement>(null);
  const liveHost = useRef<HTMLDivElement>(null);
  const liveEngine = useRef<ParticleEngine | null>(null);
  const fluidVideo = useRef<HTMLVideoElement | null>(null);
  const mediaState = useMediaSession(mediaSession);
  const { source, playing: isPlaying, time: currentTime } = mediaState;
  const sharedMedia = mediaState.media?.info ?? null;
  const setSource = useCallback((next: MediaSource) => mediaSession.setSource(next), [mediaSession]);
  const fluidRequested = useRef(source === 'fluid');
  const fluidPointer = useRef<FluidPointerHandle | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const studio = useRef<StudioRenderer | null>(null);
  const activeScene = useRef<SceneId>('collins');
  const switchingRef = useRef(false);
  const [sceneId, setSceneId] = useState<SceneId>('collins');
  const [rendererVersion, setRendererVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const previousSource = useRef<MediaSource>('stored');
  const [fluidReady, setFluidReady] = useState(false);
  const [livePanelOpen, setLivePanelOpen] = useState(false);
  const [settingsByScene, setSettingsByScene] = useState<Record<SceneId, DisplaySettings>>(DEFAULT_SETTINGS);
  const [isDragging, setIsDragging] = useState(false);
  const selectedChroma = chromaSession.images.find(image => image.id === chromaSession.selectedId);
  const activeLive = source === 'chroma' && !!selectedChroma;
  const activeFluid = source === 'fluid';
  const media: MediaInfo = activeLive ? {
    name: selectedChroma.name, kind: 'chroma', width: 0, height: 0, duration: 0, previewUrl: selectedChroma.url,
  } : activeFluid ? { name: 'Fluid Live', kind: 'fluid', width: photo ? 1920 : 960, height: photo ? 1080 : 540, duration: 0, previewUrl: null } : sharedMedia ?? (photo ? {
    ...DEFAULT_MEDIA[sceneId], name: '原图暖色灯光', previewUrl: `/assets/light-lab/photo/${sceneId}-background.webp`,
  } : DEFAULT_MEDIA[sceneId]);
  const settings = settingsByScene[sceneId];

  useEffect(() => {
    if (!canvasHost.current) return;
    try {
      const scene = createStudio(canvasHost.current, () => setReady(true), setError, pointer => {
        const value: StudioPointer = pointer ?? { u: 0, v: 0, held: false, scatter: false };
        liveEngine.current?.setPointer(value.u, value.v, value.held, value.scatter, !!pointer);
        fluidPointer.current?.setPointer(value.u, value.v, !!pointer && value.held, value.scatter);
      });
      studio.current = scene;
      scene.setStoredMedia(mediaSession.getSnapshot().media);
      if (source === 'chroma') scene.setLiveSource('chroma');
      if (source === 'fluid' && fluidVideo.current) { scene.setFluidVideo(fluidVideo.current); scene.setLiveSource('fluid'); }
      return () => { studio.current = null; scene.dispose(); };
    } catch {
      setError('无法启动 WebGL，请启用硬件加速或使用支持 WebGL 的浏览器。');
    }
  }, [rendererVersion, createStudio, mediaSession]);

  useEffect(() => { studio.current?.setStoredMedia(mediaState.media); }, [mediaState.media, rendererVersion]);
  useEffect(() => {
    if (source !== 'fluid') studio.current?.setLiveSource(source === 'chroma' ? 'chroma' : null);
  }, [source, rendererVersion]);

  useEffect(() => {
    if (!activeLive || !selectedChroma || !liveHost.current) return;
    let alive = true;
    let instance: ParticleEngine | null = null;
    void import('../chroma/particleEngine').then(({ ParticleEngine }) => {
      if (!alive || !liveHost.current) return;
      const engine = new ParticleEngine(liveHost.current, (message) => {
        if (!message) return;
        studio.current?.setLiveSource(null);
        setSource('stored');
        setError('Chroma 实时画面已中断，请重新选择。');
        setLeftOpen(true);
      }, 2.2, photo ? { width: 1920, height: 1080 } : undefined);
      liveEngine.current = engine;
      instance = engine;
      engine.setData(selectedChroma.data);
      engine.setControls(chromaSession.controls);
      engine.setPlaying(chromaSession.visualPlaying);
      studio.current?.setLiveCanvas(engine.canvas);
    }).catch(() => {
      if (!alive) return;
      studio.current?.setLiveSource(null);
      setSource('stored');
      setError('无法启动 Chroma 实时画面，请检查 WebGL。');
      setLeftOpen(true);
    });
    return () => {
      alive = false;
      studio.current?.setLiveCanvas(null);
      instance?.dispose();
      if (liveEngine.current === instance) liveEngine.current = null;
    };
    // Keep the particle engine and its canvas alive while switching Lightform scenes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLive, rendererVersion, photo]);

  useEffect(() => { if (selectedChroma) liveEngine.current?.setData(selectedChroma.data); }, [selectedChroma]);
  useEffect(() => { liveEngine.current?.setControls(chromaSession.controls); }, [chromaSession.controls]);
  useEffect(() => { liveEngine.current?.setPlaying(chromaSession.visualPlaying); }, [chromaSession.visualPlaying]);

  useEffect(() => {
    studio.current?.setDisplay('sphere', settingsByScene.sphere);
    studio.current?.setDisplay('collins', settingsByScene.collins);
    studio.current?.setDisplay('facade', settingsByScene.facade);
  }, [settingsByScene]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setLeftOpen(false); setRightOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const updateSetting = (key: keyof DisplaySettings) => (value: number) => {
    setSettingsByScene((current) => ({
      ...current, [sceneId]: { ...current[sceneId], [key]: value },
    }));
  };

  const switchScene = async (id: SceneId) => {
    if (id === activeScene.current || switchingRef.current || !studio.current) return;
    switchingRef.current = true;
    setSwitching(true);
    setError('');
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
      await studio.current.setScene(id);
      activeScene.current = id;
      setSceneId(id);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '场景加载失败。');
      setLeftOpen(true);
    } finally { switchingRef.current = false; setSwitching(false); }
  };

  const upload = useCallback(async (file?: File) => {
    if (!file || !studio.current || switchingRef.current) return;
    const valid = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (!valid.includes(file.type)) {
      setError('请选择 JPG、PNG、WebP、MP4 或 WebM 文件。视频还需由当前浏览器支持解码。');
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setError(''); setBusy(true);
    try {
      await mediaSession.load(file);
      fluidRequested.current = false;
      setLeftOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '媒体加载失败。');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }, [mediaSession]);

  const chooseLive = () => {
    if (!selectedChroma || !studio.current || switchingRef.current) return;
    fluidRequested.current = false;
    setError('');
    studio.current.setLiveSource('chroma');
    setSource('chroma');
    setFluidReady(false);
    setLivePanelOpen(true);
    setLeftOpen(false);
  };

  const chooseFluid = () => {
    if (!studio.current || switchingRef.current || !fluidSupported()) return;
    fluidRequested.current = true;
    previousSource.current = source;
    setError('');
    setFluidReady(false);
    setSource('fluid');
    setLivePanelOpen(true);
    setLeftOpen(false);
  };

  const fluidStarted = useCallback((video: HTMLVideoElement) => {
    if (!fluidRequested.current) return;
    fluidVideo.current = video;
    studio.current?.setFluidVideo(video);
    studio.current?.setLiveSource('fluid');
    setFluidReady(true);
  }, []);
  const fluidFailed = useCallback(() => {
    if (!fluidRequested.current) return;
    fluidRequested.current = false;
    const previous = previousSource.current;
    studio.current?.setLiveSource(previous === 'chroma' ? 'chroma' : null);
    setSource(previous);
    setFluidReady(false);
    setError('无法启动 Fluid 实时画面，请检查 WebGPU 和视频流权限。');
    setLeftOpen(true);
  }, []);
  const fluidReleased = useCallback((video: HTMLVideoElement) => {
    if (fluidVideo.current !== video) return;
    fluidVideo.current = null;
    studio.current?.setFluidVideo(null);
  }, []);

  const chooseStored = () => {
    if (!studio.current || switchingRef.current) return;
    fluidRequested.current = false;
    studio.current.setLiveSource(null);
    setSource('stored');
    setFluidReady(false);
  };

  const removeMedia = async () => {
    if (!studio.current || switchingRef.current) return;
    setError(''); setBusy(true);
    try {
      fluidRequested.current = false;
      mediaSession.reset();
    } catch { setError('演示素材恢复失败。'); }
    finally { setBusy(false); }
  };

  const togglePlayback = async () => {
    if (switchingRef.current) return;
    try {
      await mediaSession.togglePlayback();
    } catch { setError('视频无法播放，请尝试使用浏览器支持的 MP4 或 WebM 编码。'); }
  };
  const seek = (value: number) => {
    if (switchingRef.current) return;
    mediaSession.seek(value);
  };

  const isCollins = sceneId === 'collins';
  const isFacade = sceneId === 'facade';
  const ledValue = isFacade ? settings.ledTexture : settings.pixel;
  const pixelDescription = ledValue < 8 ? '平滑画面' : ledValue < 58 ? '细密灯珠' : '明显灯珠与暗缝';
  const sceneLabel = isCollins ? '888 COLLINS STREET' : isFacade ? 'CURVED PAVILION' : 'DOME PAVILION';

  return <div className={`lightform-studio${photo ? ' photo-studio' : ''}`}><div className="page-matte">
    <div className="app-shell" role="region" aria-label={t(photo ? '图片建筑光影测试' : 'Lightform Studio LED 建筑模拟器')}>
      <div ref={canvasHost} className="canvas-host" aria-label={photo ? t('固定视角的建筑图片预览') : isCollins ? t('可旋转的 888 Collins 大楼 3D 预览') : isFacade ? t('可旋转的弧形展馆 3D 预览') : t('可旋转的球形展馆 3D 预览')} />
      {!ready && <div className="scene-loading" role="status">{error ? <><span>{t(error)}</span><button type="button" onClick={() => { setError(''); setRendererVersion(value => value + 1); }}>{t('重试')}</button></> : <><span className="loading-orbit" />{t(photo ? '正在加载固定视角图片…' : '正在加载街区塔楼场景…')}</>}</div>}
      {!photo && <div className="scene-vignette" />}
      <div className={`scene-switch-mask${switching ? ' active' : ''}`} aria-hidden="true" />
      {(activeLive || activeFluid) && <section className={`live-preview${livePanelOpen ? '' : ' collapsed'}${rightOpen ? ' with-settings' : ''}`} aria-label={t(activeFluid ? 'Fluid 实时交互预览' : 'Chroma 实时交互预览')}>
        <button type="button" className="live-preview-toggle" aria-label={t(activeFluid ? (livePanelOpen ? '隐藏 Fluid 预览' : '显示 Fluid 预览') : (livePanelOpen ? '隐藏 Chroma 预览' : '显示 Chroma 预览'))} aria-expanded={livePanelOpen} aria-controls="lightform-live-canvas" onClick={() => setLivePanelOpen(value => !value)}>
          <span className="live-preview-dot" /><span className="live-preview-title">{t(activeFluid ? 'Fluid 实时画面' : 'Chroma 实时画面')}</span>{livePanelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <div id="lightform-live-canvas" className="live-preview-body" aria-hidden={!livePanelOpen} inert={!livePanelOpen}>
          <div className="live-preview-canvas" aria-label={t('用鼠标交互控制建筑上的粒子画面')}>
            {activeLive && <div ref={liveHost} className="chroma-preview-host" />}
            {activeFluid && <Suspense fallback={<span>{t('正在启动 Fluid 实时画面…')}</span>}><FluidLivePreview settings={fluidSettings} highResolution={photo} onReady={fluidStarted} onError={fluidFailed} onRelease={fluidReleased} onPointerReady={handle => { fluidPointer.current = handle; }} /></Suspense>}
          </div>
          <p>{t(activeFluid ? (fluidReady ? '拖动吸引 · 右键推散' : '正在启动 Fluid 实时画面…') : '移动鼠标形成漩涡 · 按住吸引 · 右键推散')}</p>
        </div>
      </section>}

      <header className="topbar">
        <div className="brand-group"><div className="brand-symbol" aria-hidden="true"><span /></div><div><strong>{photo ? 'PHOTO' : 'LIGHTFORM'} <em>{photo ? 'LAB' : 'STUDIO'}</em></strong><small>{photo ? t('固定视角 · 图片光影测试') : 'ARCHITECTURAL LIGHT LAB'}</small></div></div>
        <nav className="scene-tabs" role="tablist" aria-label={t('选择场景')}>
          <button role="tab" aria-selected={isCollins} className={isCollins ? 'selected' : ''} disabled={!ready || switching} onClick={() => void switchScene('collins')}>888 Collins</button>
          <button role="tab" aria-selected={isFacade} className={isFacade ? 'selected' : ''} disabled={!ready || switching} onClick={() => void switchScene('facade')}><span className="tab-long">{t('弧形点阵展馆')}</span><span className="tab-short">{t('弧形展馆')}</span></button>
          <button role="tab" aria-selected={sceneId === 'sphere'} className={sceneId === 'sphere' ? 'selected' : ''} disabled={!ready || switching} onClick={() => void switchScene('sphere')}><span className="tab-long">{t('球形展馆')}</span><span className="tab-short">{t('球形展馆')}</span></button>
        </nav>
        <button className="export-button" disabled={!ready || switching} onClick={() => studio.current?.exportPng()}><Camera size={15} />{t('导出画面')}</button>
      </header>

      <button className={`edge-tab edge-tab-left${leftOpen ? ' active' : ''}`} onClick={() => setLeftOpen((value) => !value)} aria-expanded={leftOpen} aria-controls="media-panel" aria-label={t(leftOpen ? '隐藏素材面板' : '显示素材面板')}>
        {leftOpen ? <ChevronLeft size={17} /> : <><Upload size={16} /><span>{t('素材')}</span><ChevronRight size={15} /></>}
      </button>
      <button className={`edge-tab edge-tab-right${rightOpen ? ' active' : ''}`} onClick={() => setRightOpen((value) => !value)} aria-expanded={rightOpen} aria-controls="settings-panel" aria-label={t(rightOpen ? '隐藏参数面板' : '显示参数面板')}>
        {rightOpen ? <ChevronRight size={17} /> : <><ChevronLeft size={15} /><span>{t('参数')}</span><Layers3 size={16} /></>}
      </button>

      <aside id="media-panel" className={`side-panel side-panel-left${leftOpen ? ' open' : ''}`} aria-label={t('素材与播放')} aria-hidden={!leftOpen} inert={!leftOpen}>
        <div className="panel-header"><div><span className="eyebrow">01 / MEDIA · {sceneLabel}</span><h2>{t('内容素材')}</h2></div><button className="close-button" onClick={() => setLeftOpen(false)} aria-label={t('关闭素材面板')}><X size={18} /></button></div>
        <div className="panel-scroll">
          {error && <div className="error-banner" role="alert"><CircleHelp size={17} /><span>{t(error)}</span><button aria-label={t('关闭错误')} onClick={() => setError('')}><X size={15} /></button></div>}
          <section className="panel-section"><div className="section-label"><span>01</span>{t('上传媒体')}</div>
            <button className={`dropzone${isDragging ? ' dragging' : ''}`} onClick={() => fileInput.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => { event.preventDefault(); setIsDragging(false); void upload(event.dataTransfer.files[0]); }} disabled={busy || !ready || switching}>
              <span className="upload-icon"><Upload size={23} strokeWidth={1.5} /></span>
              <strong>{t(busy ? '正在处理媒体…' : '上传图片或视频')}</strong><small>{t('点击选择，或将文件拖拽到此处')}</small>
              <span className="file-types">JPG · PNG · WEBP · MP4 · WEBM</span>
            </button>
            <input ref={fileInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => void upload(event.target.files?.[0])} />
          </section>
          <section className="panel-section live-source-section"><div className="section-label"><span>02</span>CHROMA LIVE</div>
            <button type="button" className={`live-source-button${activeLive ? ' chosen' : ''}`} disabled={!selectedChroma || !ready || switching} onClick={activeLive ? chooseStored : chooseLive} aria-pressed={activeLive}>
              <span className="live-preview-dot" /><strong>{t(activeLive ? '切回原素材' : '使用 Chroma 实时画面')}</strong>
              <small>{t(selectedChroma ? '将当前粒子效果实时映射到全部三个场景' : '先在 Chroma Field 制作画面')}</small>
            </button>
            {!selectedChroma && <button type="button" className="live-source-link" onClick={() => navigate('/lab?mode=chroma')}>{t('前往 Chroma Field')}</button>}
            <button type="button" className={`live-source-button fluid-source-button${activeFluid ? ' chosen' : ''}`} disabled={!ready || switching || !fluidSupported()} onClick={activeFluid ? chooseStored : chooseFluid} aria-pressed={activeFluid}>
              <span className="live-preview-dot" /><strong>{t(activeFluid ? '切回原素材' : '使用 Fluid 实时画面')}</strong>
              <small>{t(fluidSupported() ? '将流光粒子实时映射到全部三个场景' : 'Fluid Live 需要 WebGPU 支持')}</small>
            </button>
            {!fluidSupported() && <p className="live-source-unavailable">{t('Fluid Live 需要 WebGPU 支持')}</p>}
          </section>
          <section className="panel-section"><div className="section-label"><span>03</span>{t('当前内容')}</div>
            <div className="media-card"><div className="media-thumb">
              {media.kind === 'demo' ? media.previewUrl ? <img src={media.previewUrl} alt={t('当前素材预览')} /> : <div className={`demo-thumb${isFacade ? ' facade-demo' : ''}`} aria-label={media.name} />
                : media.kind === 'fluid' ? <div className="fluid-media-thumb" aria-label="Fluid Live" />
                : media.kind === 'image' || media.kind === 'chroma' ? <img src={media.previewUrl ?? ''} alt={t('当前素材预览')} />
                  : <video src={media.previewUrl ?? ''} muted playsInline preload="metadata" aria-label={t('当前视频缩略图')} />}
            </div><div className="media-meta"><strong title={media.name}>{t(media.name)}</strong><span>{media.kind === 'chroma' || media.kind === 'fluid' ? t('实时粒子画面') : media.kind === 'demo' ? t('建筑点阵 · 动态演示') : `${media.width} × ${media.height}`}</span><small>{media.kind === 'chroma' ? 'CHROMA LIVE' : media.kind === 'fluid' ? 'FLUID LIVE' : media.kind === 'demo' ? 'BUILT-IN PREVIEW' : media.kind === 'video' ? 'VIDEO / LOCAL FILE' : 'IMAGE / LOCAL FILE'}</small></div>
              {media.kind === 'chroma' || media.kind === 'fluid' ? <button className="media-remove" title={t('切回原素材')} aria-label={t('切回原素材')} disabled={switching} onClick={chooseStored}><X size={15} /></button> : sharedMedia && <button className="media-remove" title={t('恢复三个场景的演示素材')} aria-label={t('恢复三个场景的演示素材')} disabled={switching} onClick={() => void removeMedia()}><X size={15} /></button>}
            </div>
            {media.kind === 'video' ? <div className="playback"><button disabled={switching} onClick={() => void togglePlayback()} aria-label={t(isPlaying ? '暂停视频' : '播放视频')}>{isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><span>{formatTime(currentTime)}</span><input type="range" min={0} max={media.duration || 1} step="0.01" value={Math.min(currentTime, media.duration || 1)} disabled={switching} onChange={(event) => seek(Number(event.target.value))} aria-label={t('视频进度')} /><span>{formatTime(media.duration)}</span></div>
              : <p className="media-note"><ImageIcon size={15} />{t(photo && (activeLive || activeFluid) ? '在建筑显示区拖动吸引 · 右键推散' : activeLive || activeFluid ? '浮窗交互会实时更新建筑画面' : isCollins ? '画面沿塔楼竖向灯带连续显示' : isFacade ? '画面按圆形光点位置采样' : '图片已映射到球形展馆')}</p>}
          </section>
          <p className="privacy-note">{t('素材在建筑光影模拟与测试项中共享；只在当前浏览器处理，不会上传到服务器。')}</p>
        </div>
      </aside>

      <aside id="settings-panel" className={`side-panel side-panel-right${rightOpen ? ' open' : ''}`} aria-label={t('显示与视角参数')} aria-hidden={!rightOpen} inert={!rightOpen}>
        <div className="panel-header"><div><span className="eyebrow">02 / CONTROLS · {sceneLabel}</span><h2>{t('显示参数')}</h2></div><button className="close-button" onClick={() => setRightOpen(false)} aria-label={t('关闭参数面板')}><X size={18} /></button></div>
        <div className="panel-scroll">
          <section className="panel-section"><div className="section-label"><span>01</span>{t(isCollins ? '塔楼灯带' : isFacade ? '点阵幕墙' : '球形展馆显示')}</div>
            <div className="settings-stack">
              <Slider label={t(isCollins ? '灯带亮度' : isFacade ? '光点亮度' : '整体亮度')} value={settings.brightness} min={20} max={120} suffix="%" icon={<Sparkles size={16} />} onChange={updateSetting('brightness')} />
              {isCollins ? <>
                <Slider label={t('灯带间隙')} value={settings.dotGap} min={0} max={90} suffix="%" icon={<Layers3 size={16} />} onChange={updateSetting('dotGap')} />
                <Slider label={t('灯带柔光')} value={settings.glow} min={0} max={100} suffix="%" icon={<Layers3 size={16} />} onChange={updateSetting('glow')} />
                <p className="control-explainer">{t('竖向灯带沿原塔楼轮廓连续显示画面；调节间隙控制灯带宽度。')}</p>
              </> : isFacade ? <>
                <Slider label={t('光点大小')} value={settings.pixel} min={0} max={100} suffix="%" icon={<Layers3 size={16} />} onChange={updateSetting('pixel')} />
                <div className="pixel-control"><Slider label={t('灯珠颗粒感')} value={settings.ledTexture} min={0} max={100} suffix="%" icon={<Layers3 size={16} />} onChange={updateSetting('ledTexture')} />
                  <div className="pixel-readout"><span className="diode-swatch" style={{ '--dot-size': `${Math.round(3 + settings.ledTexture * 0.09)}px`, '--dot-opacity': `${Math.max(0.12, settings.ledTexture / 100)}` } as React.CSSProperties} /><div><strong>{t(pixelDescription)}</strong><small>{t('0 平滑画面 · 100 清晰可见的独立灯珠')}</small></div></div>
                </div>
                <Slider label={t('点阵柔光')} value={settings.glow} min={0} max={100} suffix="%" icon={<Sparkles size={16} />} onChange={updateSetting('glow')} />
                <p className="control-explainer">{t('圆形光点沿展馆曲面连续采样；暗缝保留原建筑质感。')}</p>
              </> : <div className="pixel-control"><Slider label={t('灯珠颗粒感')} value={settings.pixel} min={0} max={100} suffix="%" icon={<Layers3 size={16} />} onChange={updateSetting('pixel')} />
                <div className="pixel-readout"><span className="diode-swatch" style={{ '--dot-size': `${Math.round(3 + settings.pixel * 0.09)}px`, '--dot-opacity': `${Math.max(0.12, settings.pixel / 100)}` } as React.CSSProperties} /><div><strong>{t(pixelDescription)}</strong><small>{t('0 平滑画面 · 100 清晰可见的独立灯珠')}</small></div></div>
              </div>}
              {photo && sceneId === 'sphere' && <Slider label={t('点阵柔光')} value={settings.glow} min={0} max={100} suffix="%" icon={<Sparkles size={16} />} onChange={updateSetting('glow')} />}
              <Slider label={t('画面水平位置')} value={settings.offset} min={sceneId === 'sphere' ? -35 : -50} max={sceneId === 'sphere' ? 35 : 50} suffix="%" icon={<ArrowLeftRight size={16} />} onChange={updateSetting('offset')} />
              {(photo || sceneId !== 'sphere') && <Slider label={t('画面垂直位置')} value={settings.vertical} min={-50} max={50} suffix="%" icon={<ArrowUpDown size={16} />} onChange={updateSetting('vertical')} />}
            </div>
            <button className="text-action" onClick={() => setSettingsByScene((current) => ({ ...current, [sceneId]: { ...DEFAULT_SETTINGS[sceneId] } }))}><RotateCcw size={15} />{t('恢复默认显示')}</button>
          </section>
          {!photo && <section className="panel-section view-section"><div className="section-label"><span>02</span>{t('视角预设')}</div>
            <div className="view-options"><button onClick={() => studio.current?.setView('front')}><Eye size={17} />{t(isCollins ? '街角' : '正面')}</button><button onClick={() => studio.current?.setView('side')}><Layers3 size={17} />{t('侧面')}</button><button onClick={() => studio.current?.setView('high')}><Video size={17} />{t('俯视')}</button></div>
            <button className="reset-view" onClick={() => studio.current?.resetView()}><RotateCcw size={16} />{t('重置视角')}</button>
          </section>}
        </div>
      </aside>

      <div className="scene-caption"><span className="caption-rule" /><div><span>{sceneLabel}</span><strong>{t(isCollins ? '让建筑随光流动。' : isFacade ? '让每个光点呼吸。' : '让影像点亮整座城市。')}</strong></div></div>
      <footer className="scene-footer"><div className="gesture-hint"><Mouse size={15} />{t(photo ? '固定视角 · 显示区拖动吸引 · 右键推散' : '拖动旋转')} {!photo && <><span />{t('滚轮缩放')}</>}</div><div className="footer-status"><span className="live-dot" /> {t(media.kind === 'chroma' ? 'Chroma 实时串流' : media.kind === 'fluid' ? 'Fluid 实时串流' : media.kind === 'video' ? (isPlaying ? '视频播放' : '视频已暂停') : media.kind === 'demo' ? (photo ? '原图暖色灯光' : '动态演示') : '图片展示')} <span className="footer-separator">/</span> {photo ? 'FIXED VIEW' : '16:9 STAGE'}</div></footer>
    </div>
  </div></div>;
}
