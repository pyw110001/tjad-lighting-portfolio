import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { useLanguage } from '../../language';
import { projectControl, useParticleField, type ParticleFieldSession } from './session';
import type { FieldPreset } from './types';
import './styles.css';

const PRESETS: { id: FieldPreset; zh: string; en: string }[] = [
  { id: 'drift', zh: '漂流', en: 'Drift' }, { id: 'vortex', zh: '旋涡', en: 'Vortex' },
  { id: 'aurora', zh: '极光', en: 'Aurora' }, { id: 'orbit', zh: '星轨', en: 'Orbits' },
  { id: 'classic', zh: '原始', en: 'Classic' },
];

export default function ParticleField({ session, compact = false }: { session: ParticleFieldSession; compact?: boolean }) {
  const { pick } = useLanguage();
  const state = useParticleField(session);
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const label = PRESETS.find(item => item.id === state.preset)!;
  useEffect(() => {
    const node = host.current, canvas = session.getCanvas();
    if (!node || !canvas) return;
    node.appendChild(canvas);
    Object.assign(node, { fieldStudy: { snapshot: session.diagnostics } });
    return () => { if (canvas.parentNode === node) canvas.remove(); };
  }, [session, state.media]);
  useEffect(() => {
    if (!speedOpen) return;
    const close = (event: globalThis.PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('.field-speed, .field-speed-toggle')) setSpeedOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [speedOpen]);
  useEffect(() => { if (state.backend !== 'webgpu' || hidden) setSpeedOpen(false); }, [state.backend, hidden]);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // The source uses object-fit:contain; letterbox pixels are not interactive.
    const width = Math.min(rect.width, rect.height * 16 / 9), height = width * 9 / 16;
    const u = (event.clientX - rect.left - (rect.width - width) / 2) / width;
    const v = (event.clientY - rect.top - (rect.height - height) / 2) / height;
    session.setPointer(u, v, event.buttons !== 0, u >= 0 && u <= 1 && v >= 0 && v <= 1);
  };
  const padMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    session.update({ control: projectControl((event.clientX - rect.left - rect.width / 2) / (rect.width * .34), -(event.clientY - rect.top - rect.height / 2) / (rect.height * .34)) });
  };
  const padKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const step = event.shiftKey ? .15 : .05;
    const { x, y } = state.control;
    session.update({ control: event.key === 'Home' ? { x: 0, y: 0 } : {
      x: x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
      y: y + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0),
    } });
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
      setFullscreenError('');
    } catch { setFullscreenError(pick('当前浏览器无法进入全屏。', 'Fullscreen is unavailable in this browser.')); }
  };
  const shortcuts = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { setSpeedOpen(false); return; }
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || (event.target as HTMLElement).closest('button,input,[role=slider]')) return;
    if (event.code === 'Space') { event.preventDefault(); session.update({ paused: !state.paused }); }
    if (event.key.toLowerCase() === 'r') session.reset();
    if (event.key.toLowerCase() === 'h') setHidden(value => !value);
  };
  return <div ref={root} className={`particle-field${compact ? ' is-compact' : ''}${hidden ? ' is-hidden' : ''}`} data-theme={state.theme}
    data-preset={state.preset} data-backend={state.backend} data-paused={state.paused} tabIndex={0} onKeyDown={shortcuts}
    aria-label={pick('粒子流场实验', 'Particle Field experiment')}>
    <div className="field-art" ref={host} onPointerMove={move} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
      onPointerUp={() => session.setPointer(0, 0, false, false)} onPointerCancel={() => session.setPointer(0, 0, false, false)} onPointerLeave={() => session.setPointer(0, 0, false, false)} />
    <div className="field-interface" inert={hidden} aria-hidden={hidden}>
      <header className="field-header"><div className="field-brand"><span className="field-light" /><div><h1>{pick('流场', 'FIELD STUDIES')}</h1><small>PARTICLE FIELD / {pick(label.zh, label.en)}</small></div></div>
        <div className="field-tools">
          <button type="button" onClick={() => session.update({ paused: !state.paused })} aria-label={pick(state.paused ? '播放粒子' : '暂停粒子', state.paused ? 'Play particles' : 'Pause particles')}>{state.paused ? '▶' : 'Ⅱ'}</button>
          <button type="button" onClick={session.reset.bind(session)} aria-label={pick('重置粒子', 'Reset particles')}>↺</button>
          <button type="button" onClick={() => session.update({ theme: state.theme === 'dark' ? 'light' : 'dark' })} aria-label={pick('切换明暗', 'Toggle light theme')}>{state.theme === 'dark' ? '☼' : '☾'}</button>
          <button type="button" aria-pressed={state.monochrome} onClick={() => session.update({ monochrome: !state.monochrome })} aria-label={pick('切换单色', 'Toggle monochrome')}>◐</button>
          <button type="button" onClick={() => void fullscreen()} aria-label={pick('实验区全屏', 'Fullscreen experiment')}>⛶</button>
          <button type="button" onClick={() => setHidden(true)} aria-label={pick('隐藏粒子控件', 'Hide particle controls')}>◌</button>
        </div>
      </header>
      <div className="field-instrument"><div className="field-pad" role="slider" tabIndex={0} aria-label={pick('流场圆盘：左右聚散，上下动静', 'Field pad: attract/repel, chaos/calm')}
        aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(state.control.x * 100)}
        aria-valuetext={`${pick('聚散', 'Spread')} ${Math.round(state.control.x * 100)}%, ${pick('动静', 'Energy')} ${Math.round(state.control.y * 100)}%`}
        onKeyDown={padKey} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); padMove(event); }} onPointerMove={padMove}
        onPointerUp={event => { event.currentTarget.releasePointerCapture(event.pointerId); }}>
        <span className="field-axis-x" /><span className="field-axis-y" />
        <span className="field-dir top">{pick('混沌', 'CHAOS')}</span><span className="field-dir bottom">{pick('平静', 'CALM')}</span>
        <span className="field-dir left">{pick('吸引', 'ATTRACT')}</span><span className="field-dir right">{pick('排斥', 'REPEL')}</span>
        <span className="field-knob" style={{ transform: `translate(${state.control.x * 68}px, ${-state.control.y * 68}px)` }} />
      </div><p>{pick('拖动圆盘 · 探索聚散与动静', 'Drag the pad · Shape the flow')}</p></div>
      <div className="field-dock">
        <div className="field-presets" role="group" aria-label={pick('粒子预设', 'Particle presets')}>{PRESETS.map(item => <button type="button" key={item.id} aria-pressed={state.preset === item.id} onClick={() => session.selectPreset(item.id)}>{pick(item.zh, item.en)}</button>)}</div>
        <div className="field-renderers" role="group" aria-label={pick('粒子渲染模式', 'Particle renderer')}>
          <button type="button" aria-pressed={state.backend === 'canvas2d'} onClick={() => session.selectBackend('canvas2d')}>2D</button>
          <button type="button" disabled={state.preset === 'classic'} aria-pressed={state.backend === 'webgpu'} onClick={() => session.selectBackend('webgpu')}>GPU</button>
          {state.backend === 'webgpu' && <button type="button" className="field-speed-toggle" aria-expanded={speedOpen} onClick={() => setSpeedOpen(value => !value)}>{pick('响应', 'Response')}</button>}
        </div>
        <p className="field-hint">{state.preset === 'classic' ? pick('原始 400 粒子 · 使用圆盘控制', 'Classic 400 particles · Use the pad') : pick('移动指针扰动 · 按住吸引', 'Move to disturb · Hold to attract')}</p>
      </div>
      {speedOpen && <div className="field-speed"><label>{pick('交互速度', 'Interaction speed')} <output>{Math.round(state.interactionSpeed * 100)}%</output><input aria-label={pick('交互速度', 'Interaction speed')} type="range" min="10" max="150" value={Math.round(state.interactionSpeed * 100)} onChange={event => session.update({ interactionSpeed: Number(event.target.value) / 100 })} /></label><button type="button" onClick={() => session.update({ interactionSpeed: .45 })}>{pick('恢复 45%', 'Reset 45%')}</button><button type="button" onClick={() => setSpeedOpen(false)} aria-label={pick('关闭响应设置', 'Close response settings')}>×</button></div>}
    </div>
    {hidden && <button type="button" className="field-restore" onClick={() => setHidden(false)}>{pick('显示控件', 'Show controls')}</button>}
    {state.loading && <div className="field-notice" role="status">{pick('正在启动粒子画面…', 'Starting particle artwork…')}</div>}
    {(state.error || fullscreenError) && <div className="field-error" role="status"><span>{fullscreenError || (state.error.startsWith('GPU fallback') ? pick('GPU 不可用，已切回 2D。', 'GPU unavailable. Switched to 2D.') : pick('无法启动画布，请重新打开实验。', 'Canvas unavailable. Reopen the experiment.'))}</span><button type="button" aria-label={pick('关闭粒子提示', 'Dismiss particle notice')} onClick={() => { session.clearError(); setFullscreenError(''); }}>×</button></div>}
  </div>;
}
