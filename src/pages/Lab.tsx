import { lazy, Suspense, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fullLabReducer, initialFullLabState } from '../experience/labState';
import type { FluidLightState, LabModuleId } from '../experience/labState';
import { useActivity } from '../experience/useActivity';
import { useLabCopy } from '../content/lab-en';
import { initialChromaSession, type ChromaSession } from '../experience/chroma/session';
import { useLanguage } from '../language';
import { LabMediaSession } from '../experience/lightform/mediaSession';
import './lab-workbench.css';

const FluidLightCanvas = lazy(() => import('../experience/fluid/FluidLightCanvas'));
const ChromaField = lazy(() => import('../experience/chroma/App'));
const LightformStudio = lazy(() => import('../experience/lightform/App'));
const PhotoStudio = lazy(() => import('../experience/photo/App'));
const asset = (name: string) => `/assets/light-lab/scenes/${name}.webp`;

const modules: { id: LabModuleId; num: string; en: string; zh: string; heading: string; image?: string; description: string }[] = [
  { id: 'day', num: '01', en: 'Day / Night', zh: '昼夜切换', heading: 'DAY / NIGHT', image: 'day', description: '在时间的流动中，感受建筑在不同时段的气质。' },
  { id: 'wave', num: '02', en: 'Fluid Light', zh: '流光粒子', heading: 'FLUID LIGHT', image: 'wave', description: '基于 WebGPU SPH 动力学与 AI 手势感应，探索建筑交互流光微粒。' },
  { id: 'chroma', num: '03', en: 'Chroma Field', zh: '色彩粒子场', heading: 'CHROMA FIELD', description: '上传图片，用色彩与声音塑造可交互的粒子画面。' },
  { id: 'lightform', num: '04', en: 'Lightform Studio', zh: '建筑光影模拟', heading: 'LIGHTFORM STUDIO', description: '在三座建筑场景中预演图片与视频的灯光表达。' },
  { id: 'photo', num: '05', en: 'Photo Lab', zh: '测试项', heading: 'PHOTO LAB', description: '用固定视角夜景图片，预演素材与实时粒子的建筑表达。' }
];

function Choice({ selected, onClick, children, className = '' }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return <button type="button" className={`lab-choice ${selected ? 'is-active' : ''} ${className}`} aria-pressed={selected} onClick={onClick}>{children}</button>;
}

function Slider({ label, value, min, max, step = 1, suffix = '', format, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; format?: (value: number) => string; onChange: (value: number) => void }) {
  return <label className="lab-slider"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} aria-label={label} /><output>{format ? format(value) : `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`}</output></label>;
}
const formatHour = (hour: number) => `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')}`;

function DayStage({ time, split, onSplit }: { time: number; split: number; onSplit: (value: number) => void }) {
  const t = useLabCopy();
  const areaRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const nightOpacity = Math.max(0, Math.min(1, (time - 16.5) / 2.5));
  const update = useCallback((clientX: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (rect) onSplit(Math.max(0.04, Math.min(0.96, (clientX - rect.left) / rect.width)));
  }, [onSplit]);
  useEffect(() => {
    const move = (event: PointerEvent) => { if (dragging.current) update(event.clientX); };
    const up = () => { dragging.current = false; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [update]);
  return <div className="lab-day-stage" ref={areaRef} onPointerDown={event => { if ((event.target as HTMLElement).closest('.lab-day-divider')) { dragging.current = true; update(event.clientX); } }}>
    <img src={asset('day')} alt="" className="lab-scene-photo" />
    <div className="lab-day-night-layer" style={{ clipPath: `inset(0 0 0 ${split * 100}%)`, opacity: nightOpacity }}><img src={asset('night')} alt="" className="lab-scene-photo" /></div>
    <div className="lab-day-divider" style={{ left: `${split * 100}%` }}>
      <button type="button" role="slider" aria-label={t('昼夜对比位置')} aria-valuemin={4} aria-valuemax={96} aria-valuenow={Math.round(split * 100)} tabIndex={0}
        onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onSplit(Math.max(0.04, Math.min(0.96, split + (event.key === 'ArrowRight' ? 0.05 : -0.05)))); } }}>
        ‹ ›
      </button>
    </div>
  </div>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
  });
}

export default function Lab() {
  const t = useLabCopy();
  const { language, pick } = useLanguage();
  const [params, setParams] = useSearchParams();
  const raw = params.get('mode');
  // The static /lab HTML is rendered for the default mode; match it during hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const mode = hydrated && (raw === 'day' || raw === 'wave' || raw === 'chroma' || raw === 'lightform' || raw === 'photo') ? raw : 'day';
  useEffect(() => {
    if (hydrated && raw && !modules.some(item => item.id === raw)) {
      const next = new URLSearchParams(params); next.set('mode', 'day');
      setParams(next, { replace: true, preventScrollReset: true });
    }
  }, [hydrated, raw, params, setParams]);
  const module = modules.find(item => item.id === mode)!;
  const [state, dispatch] = useReducer(fullLabReducer, initialFullLabState);
  const [chromaSession, setChromaSession] = useState<ChromaSession>(initialChromaSession);
  const [mediaSession] = useState(() => new LabMediaSession());
  useEffect(() => () => mediaSession.dispose(), [mediaSession]);
  useEffect(() => { mediaSession.setActive(mode === 'lightform' || mode === 'photo'); }, [mode, mediaSession]);
  const chromaSessionRef = useRef(chromaSession);
  chromaSessionRef.current = chromaSession;
  useEffect(() => () => {
    chromaSessionRef.current.images.forEach(image => URL.revokeObjectURL(image.url));
  }, []);
  const [reduced, setReduced] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [demo, setDemo] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const active = useActivity(stageRef);
  const onWaveSettingsChange = useCallback((patch: Partial<FluidLightState>) => {
    if (patch.palette !== undefined) dispatch({ type: 'WAVE_SET_PALETTE', value: patch.palette });
    if (patch.customColors !== undefined) dispatch({ type: 'WAVE_SET_COLORS', value: patch.customColors });
    if (patch.particleCount !== undefined) dispatch({ type: 'WAVE_SET_COUNT', value: patch.particleCount });
    if (patch.inputMode !== undefined) dispatch({ type: 'WAVE_SET_MODE', value: patch.inputMode });
    if (patch.gravity !== undefined) dispatch({ type: 'WAVE_SET_GRAVITY', value: patch.gravity });
    if (patch.viscosity !== undefined) dispatch({ type: 'WAVE_SET_VISCOSITY', value: patch.viscosity });
    if (patch.particleRadius !== undefined) dispatch({ type: 'WAVE_SET_RADIUS', value: patch.particleRadius });
    if (patch.paused !== undefined) dispatch({ type: 'WAVE_SET_PAUSED', value: patch.paused });
  }, []);

  useEffect(() => { dispatch({ type: 'SET_MODULE', value: mode }); setDemo(false); }, [mode]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(query.matches);
    sync(); query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  useEffect(() => { if (reduced || !active) setDemo(false); }, [reduced, active]);
  useEffect(() => {
    if (!demo || !active || reduced || mode !== 'day') return;
    const interval = window.setInterval(() => {
      dispatch({ type: 'DAYNIGHT_SET_TIME', value: state.dayNight.time >= 24 ? 6 : state.dayNight.time + 0.24 });
    }, 70);
    return () => window.clearInterval(interval);
  }, [demo, active, reduced, mode, state.dayNight.time]);

  const switchMode = (nextMode: LabModuleId) => {
    if (mode === 'wave' && nextMode !== 'wave') dispatch({ type: 'WAVE_SET_MODE', value: 'mouse' });
    const next = new URLSearchParams(params); next.set('mode', nextMode);
    setParams(next, { preventScrollReset: true });
    setHelpOpen(false);
  };
  const reset = () => {
    setDemo(false);
    if (mode === 'day') { dispatch({ type: 'DAYNIGHT_SET_TIME', value: 19.5 }); dispatch({ type: 'DAYNIGHT_SET_SPLIT', value: 0.62 }); }
    if (mode === 'wave') dispatch({ type: 'RESET_WAVE' });
  };
  const capture = async () => {
    try {
      const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
      const drawCover = (image: HTMLImageElement) => {
        const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
        const w = image.width * scale, h = image.height * scale;
        context.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      };
      drawCover(await loadImage(asset(module.image!)));
      context.filter = 'none';
      if (mode === 'day') {
        const night = await loadImage(asset('night'));
        context.save(); context.beginPath(); context.rect(canvas.width * state.dayNight.splitRatio, 0, canvas.width, canvas.height); context.clip();
        context.globalAlpha = Math.max(0, Math.min(1, (state.dayNight.time - 16.5) / 2.5)); drawCover(night); context.restore();
      }
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Image encode failed');
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `TJAD-Light-Lab-${mode}.png`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(t('实验画面已保存'));
    } catch { setMessage(t('保存失败，请重试')); }
    window.setTimeout(() => setMessage(''), 6000);
  };
  return <div className="lab-workbench" data-mode={mode}>
    <nav className="lab-rail" aria-label={t('实验模块')}>
      <div className="lab-rail-list">{modules.map(item => <button key={item.id} type="button" data-module={item.id} className={`lab-rail-item ${mode === item.id ? 'is-active' : ''}`} aria-current={mode === item.id ? 'page' : undefined} onClick={() => switchMode(item.id)}>
        <span className="lab-rail-node" aria-hidden="true" /><span className="lab-rail-number">{item.num}</span><span className="lab-rail-label" lang={language === 'zh' ? 'zh-CN' : 'en'}>{pick(item.zh, item.en)}</span>
      </button>)}</div>
      <div className="lab-rail-footer">{pick('探索', 'EXPLORE')}<br />{pick('调整', 'ADJUST')}<br />{pick('体验', 'EXPERIENCE')}</div>
    </nav>
    <div className="lab-stage" ref={stageRef}>
      {mode === 'chroma' || mode === 'lightform' || mode === 'photo' || mode === 'wave' ? <Suspense fallback={<div className="lab-import-loading" role="status">{t('正在加载实验…')}</div>}>
        {mode === 'chroma' ? <ChromaField key="chroma" session={chromaSession} setSession={setChromaSession} /> : mode === 'lightform' ? <LightformStudio key="lightform" chromaSession={chromaSession} fluidSettings={state.fluidLight} mediaSession={mediaSession} /> : mode === 'photo' ? <PhotoStudio key="photo" chromaSession={chromaSession} fluidSettings={state.fluidLight} mediaSession={mediaSession} /> : <FluidLightCanvas key="wave" initialSettings={{ ...state.fluidLight, paused: reduced || state.fluidLight.paused }} reducedMotion={reduced} onSettingsChange={onWaveSettingsChange} />}
      </Suspense> : <>
      <DayStage time={state.dayNight.time} split={state.dayNight.splitRatio} onSplit={value => dispatch({ type: 'DAYNIGHT_SET_SPLIT', value })} />
      <div className="lab-stage-shade" aria-hidden="true" />
      <div className="lab-stage-copy">
        <span className="lab-overline">TJAD ARCHITECTURAL LIGHTING</span>
        <span className="lab-index">{module.num} / INTERACTIVE</span>
        <h1>{module.heading}</h1>
        <h2>{language === 'zh' ? module.zh : t(module.zh)}</h2>
        <p>{t(module.description)}</p>
        <span className="lab-caption">EXPLORE. ADJUST. EXPERIENCE.</span>
      </div>
      <div className="lab-stage-actions">
        <button type="button" onClick={reset}>{t('重置')}</button>
        <button type="button" aria-expanded={helpOpen} aria-controls="lab-help" onClick={() => setHelpOpen(open => !open)}>{t('使用指引')} <span aria-hidden="true">↗</span></button>
      </div>
      {helpOpen && <aside id="lab-help" className="lab-help" aria-label={t('使用指引')}>
        <button type="button" className="lab-help-close" onClick={() => setHelpOpen(false)} aria-label={t('关闭说明')}>×</button>
        <span className="lab-overline">LIGHT LAB / GUIDE</span><h3>{t('使用指引')}</h3>
        <ol><li>{t('选择左侧实验模块')}</li><li>{t('调整底部参数并观察场景变化')}</li><li>{t('拖动昼夜分割线或在场景中移动指针')}</li></ol>
        <p>{t('概念场景用于交互研究，不代表实际项目。')}</p>
        <button type="button" className="lab-save" onClick={capture}>{t('保存当前实验画面')} ↗</button>
        {message && <div role="status" className="lab-message">{message}</div>}
      </aside>}
      <div className="lab-console" aria-label={t('实验控制台')}>
        {mode === 'day' && <>
          <div className="lab-console-primary"><div className="lab-choice-row">{([['白天', 12], ['黄昏', 17.5], ['夜晚', 20]] as const).map(([label, time]) => <Choice key={label} selected={Math.abs(state.dayNight.time - time) < 0.6} onClick={() => dispatch({ type: 'DAYNIGHT_SET_TIME', value: time })}>{t(label)}</Choice>)}<Choice selected={demo} onClick={() => setDemo(value => !value)}>{t('动态演示')}</Choice></div>
            <Slider label={t('昼夜时间轴')} value={state.dayNight.time} min={6} max={24} step={0.25} format={formatHour} onChange={value => dispatch({ type: 'DAYNIGHT_SET_TIME', value })} />
            <div className="lab-timeline-ticks"><span>06:00</span><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span><span>24:00</span></div>
          </div><div className="lab-console-secondary"><span className="lab-console-label">{t('场景预设')}</span><div className="lab-preset-row">{([['白天', 12, 'day', 'none'], ['黄昏', 17.5, 'day', 'sepia(.35) saturate(1.2) brightness(.8)'], ['夜晚', 20, 'night', 'none'], ['深夜', 24, 'night', 'brightness(.65)']] as const).map(([label, time, image, filter]) => <Choice key={label} className="lab-preset" selected={Math.abs(state.dayNight.time - time) < 0.6} onClick={() => dispatch({ type: 'DAYNIGHT_SET_TIME', value: time })}><img src={asset(image)} alt="" style={{ filter }} /><span>{t(label)}</span></Choice>)}</div></div>
          <button type="button" className="lab-play" aria-pressed={demo} disabled={reduced} onClick={() => setDemo(value => !value)}><span>{demo ? 'Ⅱ' : '▶'}</span>{t(demo ? '暂停演示' : '对比播放')}</button>
        </>}
      </div>
      </>}
    </div>
  </div>;
}
