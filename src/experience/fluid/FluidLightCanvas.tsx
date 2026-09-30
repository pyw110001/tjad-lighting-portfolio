import { useEffect, useRef, useState, useCallback } from 'react';
import { FLUID_PARTICLE_LIMITS, WebGPUFluidEngine } from './WebGPUFluidEngine';
import { ArrowDownToLine, Expand, Pause, Play, RotateCcw } from 'lucide-react';
import './workbench.css';
import { DEFAULT_FLUID_COLORS, type FluidCustomColors, type FluidPaletteType, FLUID_PALETTE_INFO } from './fluidPalettes';
import { useGestureTracking } from './useGestureTracking';
import { useLabCopy } from '../../content/lab-en';
import { useLanguage } from '../../language';
import type { FluidLightState } from '../labState';

interface FluidLightCanvasProps {
  initialPalette?: FluidPaletteType;
  initialSettings?: FluidLightState;
  reducedMotion?: boolean;
  onSettingsChange?: (patch: Partial<FluidLightState>) => void;
  onResetRequested?: (resetFn: () => void) => void;
}

export default function FluidLightCanvas({
  initialPalette = 'warm3000',
  initialSettings,
  reducedMotion = false,
  onSettingsChange,
  onResetRequested
}: FluidLightCanvasProps) {
  const t = useLabCopy();
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGPUFluidEngine | null>(null);
  const syncActivityRef = useRef<(() => void) | null>(null);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [inputMode, setInputMode] = useState<'mouse' | 'gesture'>(initialSettings?.inputMode ?? 'mouse');
  const [currentPalette, setCurrentPalette] = useState<FluidPaletteType>(initialSettings?.palette ?? initialPalette);
  const [customColors, setCustomColors] = useState<FluidCustomColors>(initialSettings?.customColors ?? DEFAULT_FLUID_COLORS);
  const [particleCount, setParticleCount] = useState(initialSettings?.particleCount ?? FLUID_PARTICLE_LIMITS.default);
  const [isPaused, setIsPaused] = useState(initialSettings?.paused ?? false);
  const [gravity, setGravity] = useState(initialSettings?.gravity ?? -9.8);
  const [viscosity, setViscosity] = useState(initialSettings?.viscosity ?? 0.85);
  const [particleRadius, setParticleRadius] = useState(initialSettings?.particleRadius ?? 3.5);
  const [showPip, setShowPip] = useState(true);
  const [fps, setFps] = useState(60);

  const {
    status: gestureStatus,
    cursorPos,
    isPinching,
    errorMessage,
    start: startGesture,
    stop: stopGesture,
    videoRef,
    canvasRef: skeletonCanvasRef
  } = useGestureTracking();

  // Initialize WebGPU Fluid Engine
  useEffect(() => {
    if (!WebGPUFluidEngine.isSupported()) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set initial canvas physical size based on container dimensions
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const container = containerRef.current;
    const clientW = canvas.clientWidth || 900;
    const clientH = canvas.clientHeight || 560;
    canvas.width = Math.max(300, Math.floor(clientW * dpr));
    canvas.height = Math.max(200, Math.floor(clientH * dpr));

    const engine = new WebGPUFluidEngine({
      palette: currentPalette,
      customColors,
      particleCount,
      gravity,
      viscosityStrength: viscosity,
      particleRadius
    });
    engineRef.current = engine;
    if (initialSettings?.paused) engine.togglePause();

    let mounted = true;
    let initialized = false;
    let inView = false;
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      engine.destroy();
    };
    const syncActivity = () => {
      if (!mounted || !initialized) return;
      const rendering = inView && !document.hidden && !engine.isPaused;
      if (rendering) engine.start();
      else engine.stop();
      if (container) container.dataset.rendering = String(rendering);
    };
    syncActivityRef.current = syncActivity;
    const observer = new IntersectionObserver(entries => {
      inView = Boolean(entries[0]?.isIntersecting);
      if (!inView) engine.setPointer(0, 0, false);
      syncActivity();
    }, { threshold: 0.01 });
    observer.observe(container ?? canvas);
    document.addEventListener('visibilitychange', syncActivity);

    engine
      .init(canvas)
      .then(() => {
        if (!mounted) return;
        initialized = true;
        setFps(engine.fps);
        syncActivity();
      })
      .catch(err => {
        if (mounted) {
          console.warn('WebGPU fluid initialization failed:', err);
          dispose();
          setSupported(false);
        }
      });

    // Provide reset handler to parent
    if (onResetRequested) {
      onResetRequested(() => {
        engine.resetSimulation();
        engine.setPalette('warm3000');
        engine.updateConfig({ gravity: -9.8, viscosityStrength: 0.85, particleRadius: 3.5, customColors: DEFAULT_FLUID_COLORS, particleCount: FLUID_PARTICLE_LIMITS.default });
        setCustomColors(DEFAULT_FLUID_COLORS); setParticleCount(FLUID_PARTICLE_LIMITS.default);
        if (engine.isPaused && !reducedMotionRef.current) engine.togglePause();
        if (!engine.isPaused && reducedMotionRef.current) engine.togglePause();
        setCurrentPalette('warm3000'); setGravity(-9.8); setViscosity(0.85); setParticleRadius(3.5); setIsPaused(engine.isPaused); setInputMode('mouse');
        stopGesture();
        syncActivity();
      });
    }

    const interval = setInterval(() => {
      if (engineRef.current) {
        setFps(engineRef.current.fps || 60);
      }
    }, 500);

    return () => {
      mounted = false;
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncActivity);
      syncActivityRef.current = null;
      clearInterval(interval);
      dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!reducedMotion || !engineRef.current || engineRef.current.isPaused) return;
    engineRef.current.togglePause();
    engineRef.current.stop();
    setIsPaused(true);
    onSettingsChange?.({ paused: true });
  }, [reducedMotion, onSettingsChange]);

  // ResizeObserver for responsive canvas bounds
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry && engineRef.current) {
        const { width, height } = canvasRef.current?.getBoundingClientRect() ?? entry.contentRect;
        if (width > 0 && height > 0) {
          engineRef.current.resize(width, height);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Sync Input Mode with Gesture Tracking
  const toggleInputMode = useCallback(() => {
    if (inputMode === 'mouse') {
      setInputMode('gesture');
      onSettingsChange?.({ inputMode: 'gesture' });
      setShowPip(true);
      startGesture();
    } else {
      setInputMode('mouse');
      onSettingsChange?.({ inputMode: 'mouse' });
      stopGesture();
    }
  }, [inputMode, startGesture, stopGesture, onSettingsChange]);

  // Sync Gesture Cursor into Fluid Engine
  useEffect(() => {
    if (inputMode !== 'gesture' || !engineRef.current) return;

    if (cursorPos) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + cursorPos.x * rect.width;
      const clientY = rect.top + cursorPos.y * rect.height;
      const world = engineRef.current.screenToWorld(clientX, clientY);

      // Pinching repels fluid particles (-1), relaxed index finger attracts (+1)
      engineRef.current.setPointer(world.x, world.y, true, isPinching ? -1.5 : 1.0);
    } else {
      engineRef.current.setPointer(0, 0, false);
    }
  }, [inputMode, cursorPos, isPinching]);

  // Pointer event handlers for Mouse / Touch Mode
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (inputMode !== 'mouse' || !engineRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const world = engineRef.current.screenToWorld(e.clientX, e.clientY);
    const sign = e.button === 2 ? -1.2 : 1.0; // Left-click attracts, Right-click repels
    engineRef.current.setPointer(world.x, world.y, true, sign);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (inputMode !== 'mouse' || !engineRef.current) return;
    const world = engineRef.current.screenToWorld(e.clientX, e.clientY);
    const isInteracting = e.buttons > 0;
    const sign = (e.buttons & 2) !== 0 ? -1.2 : 1.0;
    engineRef.current.setPointer(world.x, world.y, isInteracting, sign);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (inputMode !== 'mouse' || !engineRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    engineRef.current.setPointer(0, 0, false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Prevent default context menu on right click to allow fluid repelling
    e.preventDefault();
  };

  // Palette switch
  const handlePaletteSelect = (pal: FluidPaletteType) => {
    setCurrentPalette(pal);
    engineRef.current?.setPalette(pal);
    onSettingsChange?.({ palette: pal });
  };

  const handleColorChange = (index: 0 | 1, color: string) => {
    const next: FluidCustomColors = [...customColors];
    next[index] = color;
    setCustomColors(next);
    setCurrentPalette('custom');
    engineRef.current?.updateConfig({ palette: 'custom', customColors: next });
    onSettingsChange?.({ palette: 'custom', customColors: next });
  };

  const handleParticleCountChange = (value: number) => {
    setParticleCount(value);
    engineRef.current?.updateConfig({ particleCount: value });
    onSettingsChange?.({ particleCount: value });
  };

  // Toggle Pause
  const handleTogglePause = () => {
    if (!engineRef.current) return;
    const paused = engineRef.current.togglePause();
    setIsPaused(paused);
    onSettingsChange?.({ paused });
    if (paused) {
      engineRef.current.stop();
      if (containerRef.current) containerRef.current.dataset.rendering = 'false';
    }
    else syncActivityRef.current?.();
  };

  // Gravity change
  const handleGravityChange = (val: number) => {
    setGravity(val);
    engineRef.current?.updateConfig({ gravity: val });
    onSettingsChange?.({ gravity: val });
  };

  // Viscosity change
  const handleViscosityChange = (val: number) => {
    setViscosity(val);
    engineRef.current?.updateConfig({ viscosityStrength: val });
    onSettingsChange?.({ viscosity: val });
  };

  // Particle size change
  const handleParticleRadiusChange = (val: number) => {
    setParticleRadius(val);
    engineRef.current?.updateConfig({ particleRadius: val });
    onSettingsChange?.({ particleRadius: val });
  };

  const resetWorkbench = () => {
    engineRef.current?.resetSimulation();
    engineRef.current?.setPalette('warm3000');
    engineRef.current?.updateConfig({ gravity: -9.8, viscosityStrength: 0.85, particleRadius: 3.5, customColors: DEFAULT_FLUID_COLORS, particleCount: FLUID_PARTICLE_LIMITS.default });
    if (reducedMotion) engineRef.current?.pause(); else engineRef.current?.resume();
    setCurrentPalette('warm3000'); setGravity(-9.8); setViscosity(0.85); setParticleRadius(3.5);
    setCustomColors(DEFAULT_FLUID_COLORS); setParticleCount(FLUID_PARTICLE_LIMITS.default);
    setIsPaused(Boolean(reducedMotion)); setInputMode('mouse'); stopGesture();
    onSettingsChange?.({ palette: 'warm3000', customColors: DEFAULT_FLUID_COLORS, particleCount: FLUID_PARTICLE_LIMITS.default, gravity: -9.8, viscosity: 0.85, particleRadius: 3.5, paused: Boolean(reducedMotion), inputMode: 'mouse' });
    syncActivityRef.current?.();
  };

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'fluid-light.png';
    link.click();
  };

  // Fallback if WebGPU is unsupported
  if (supported === false) {
    return (
      <div className="fluid-light fluid-fallback-wrap">
        <img
          src="/assets/brand/lab.webp"
          alt={t("流光粒子静态预览")}
          className="lab-poster"
        />
        <div className="fluid-fallback-overlay">
          <div className="fallback-badge">WEBGPU REQUIRED</div>
          <h3>{t("流光粒子需 WebGPU 支持")}</h3>
          <p>{t("您的浏览器或当前显卡环境暂不支持 WebGPU Compute Shader。")}<br />{t("推荐使用最新版本 Chrome 113+ 或 Edge 浏览器开启硬件加速进行体验。")}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fluid-light fluid-viewport-container"
      ref={containerRef}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        className="fluid-webgpu-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      <div className="fluid-stage-heading"><span>02 / LIGHT LAB</span><h1>{language === 'en' ? 'Fluid Light' : '流光粒子'}</h1><p>LIVE WEBGPU PARTICLES</p></div>
      <div className="fluid-stage-hint">{language === 'en' ? 'Drag to attract · Right-click to repel' : '拖动吸引 · 右键推散'}</div>

      {/* Vertical Toolbar (Left) */}
      <div className="viewport-toolbar-vertical" role="toolbar" aria-label={t("流光交互工具栏")}>
        <div className="fluid-wordmark">FLUID<br />LIGHT</div>
        <h2>{language === 'en' ? 'Interaction' : '交互方式'}</h2>
        {/* Input Mode Toggle */}
        <button
          type="button"
          className={`toolbar-btn ${inputMode === 'gesture' ? 'active' : ''}`}
          onClick={toggleInputMode}
          title={inputMode === 'mouse' ? t("切换为 AI 手势感应模式") : t("切换为鼠标光标模式")}
          aria-pressed={inputMode === 'gesture'}
        >
          <span className="btn-icon">{inputMode === 'gesture' ? '✋' : '↖'}</span>
          <span className="btn-label">{inputMode === 'gesture' ? t("手势") : t("光标")}</span>
        </button>

        <h2>{language === 'en' ? 'Color palettes' : '色彩方案'}</h2>
        {/* Color Palette Buttons */}
        {FLUID_PALETTE_INFO.map(p => (
          <button
            key={p.id}
            type="button"
            className={`toolbar-btn ${currentPalette === p.id ? 'active' : ''}`}
            onClick={() => handlePaletteSelect(p.id)}
            title={language === 'en' ? p.nameEn : p.nameZh}
            aria-pressed={currentPalette === p.id}
          >
            <span
              className="btn-icon-dot"
              style={{ backgroundColor: p.primaryColor }}
            />
            <span className="btn-label">{language === 'en' ? p.nameEn : p.nameZh.slice(0, 2)}</span>
          </button>
        ))}
        <button type="button" className={`toolbar-btn ${currentPalette === 'custom' ? 'active' : ''}`} aria-pressed={currentPalette === 'custom'} onClick={() => handlePaletteSelect('custom')}>
          <span className="btn-icon-dot" style={{ background: `linear-gradient(135deg, ${customColors[0]}, ${customColors[1]})` }} />
          <span className="btn-label">{t('自定义渐变')}</span>
        </button>
        <div className="fluid-custom-colors">
          {(['低速颜色', '高速颜色'] as const).map((label, index) => <label key={label}>
            <span>{t(label)}</span>
            <input type="color" value={customColors[index]} aria-label={t(label)} onChange={event => handleColorChange(index as 0 | 1, event.target.value)} />
            <code>{customColors[index].toUpperCase()}</code>
          </label>)}
          <div className="fluid-gradient-preview" style={{ background: `linear-gradient(90deg, ${customColors[0]}, ${customColors[1]})` }} />
          <p>{t('颜色随运动速度过渡')}</p>
        </div>
      </div>

      {/* Floating Gesture Luminous Cursor */}
      {inputMode === 'gesture' && cursorPos && (
        <div
          className={`gesture-luminous-cursor ${isPinching ? 'pinch-shockwave' : ''}`}
          style={{
            left: `${(canvasRef.current?.offsetLeft ?? 220) + cursorPos.x * (canvasRef.current?.clientWidth ?? 0)}px`,
            top: `${(canvasRef.current?.offsetTop ?? 0) + cursorPos.y * (canvasRef.current?.clientHeight ?? 0)}px`
          }}
          aria-hidden="true"
        >
          <div className="cursor-core" />
          <div className="cursor-pulse-ring" />
          <span className="cursor-status-tag">
            {isPinching ? t("推散光浪 (Pinch)") : t("食指导光")}
          </span>
        </div>
      )}

      {/* Camera Gesture PIP Preview (Bottom Right) */}
      {inputMode === 'gesture' && showPip && (
        <div className="fluid-pip-card" aria-label={t("手势追踪预览窗")}>
          <div className="pip-header">
            <span className="pip-title">{t("AI 手势感知")}</span>
            <button
              type="button"
              className="pip-close"
              onClick={() => setShowPip(false)}
              title={t("最小化画中画")}
            >
              ×
            </button>
          </div>
          <div className="pip-stage">
            <video
              ref={videoRef}
              className="pip-video"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={skeletonCanvasRef}
              width={220}
              height={165}
              className="pip-overlay"
            />
          </div>
          <div className="pip-status-bar">
            {gestureStatus === 'starting' && t("正在连接摄像头...")}
            {gestureStatus === 'waiting_hand' && t("请将右手置于镜头前")}
            {gestureStatus === 'attracting' && t("食指导光中 · 移动手掌")}
            {gestureStatus === 'pinching' && t("捏合中 · 释放流光冲击波")}
            {gestureStatus === 'error' && (errorMessage ? t(errorMessage) : t("摄像头连接受限"))}
          </div>
        </div>
      )}

      {/* Bottom Horizontal Parameter Toolbar */}
      <div className="viewport-overlay-bottom fluid-bottom-bar">
        <div className="fluid-inspector-title"><span>FLUID / SETTINGS</span><h2>{language === 'en' ? 'Particle controls' : '粒子参数'}</h2></div>
        {/* Gravity Control */}
        <div className="fluid-control-group">
          <span className="control-label">{t("重力场")}</span>
          <input
            type="range"
            min="-15"
            max="15"
            step="0.5"
            value={gravity}
            onChange={e => handleGravityChange(parseFloat(e.target.value))}
            className="field-timeline-slider"
            title={t("调节环境重力加速度")}
            aria-label={t("调节环境重力加速度")}
          />
          <span className="control-val">{gravity.toFixed(1)}</span>
        </div>

        {/* Viscosity Control */}
        <div className="fluid-control-group">
          <span className="control-label">{t("流体粘度")}</span>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.05"
            value={viscosity}
            onChange={e => handleViscosityChange(parseFloat(e.target.value))}
            className="field-timeline-slider"
            title={t("调节光微粒流动的粘滞阻力")}
            aria-label={t("调节光微粒流动的粘滞阻力")}
          />
          <span className="control-val">{viscosity.toFixed(2)}</span>
        </div>

        {/* Particle Radius Control */}
        <div className="fluid-control-group">
          <span className="control-label">{t("光粒子尺度")}</span>
          <input
            type="range"
            min="1.5"
            max="6.0"
            step="0.5"
            value={particleRadius}
            onChange={e => handleParticleRadiusChange(parseFloat(e.target.value))}
            className="field-timeline-slider"
            title={t("调节光斑微内核渲染半径")}
            aria-label={t("调节光斑微内核渲染半径")}
          />
          <span className="control-val">{particleRadius.toFixed(1)}</span>
        </div>

        {/* Performance Badge */}
        <div className="fluid-control-group">
          <span className="control-label">{t('粒子数量')}</span>
          <input type="range" min={FLUID_PARTICLE_LIMITS.min} max={FLUID_PARTICLE_LIMITS.max} step={FLUID_PARTICLE_LIMITS.step} value={particleCount} onChange={event => handleParticleCountChange(Number(event.target.value))} aria-label={t('粒子数量')} />
          <span className="control-val">{particleCount.toLocaleString(language === 'en' ? 'en-US' : 'zh-CN')}</span>
        </div>
        <div className="fluid-stats-pill">
          <span className="stat-dot" />
          <span>{particleCount.toLocaleString(language === 'en' ? 'en-US' : 'zh-CN')} {t('微粒')}</span>
          <span className="stat-divider">/</span>
          <span>{fps} FPS</span>
        </div>
      </div>
      <footer className="fluid-transport">
        <button className="fluid-transport-play" onClick={handleTogglePause} aria-label={language === 'en' ? (isPaused ? 'Resume simulation' : 'Pause simulation') : (isPaused ? '继续模拟' : '暂停模拟')}>{isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}</button>
        <span>{isPaused ? (language === 'en' ? 'Paused' : '已暂停') : (language === 'en' ? 'Live WebGPU particles' : '实时 WebGPU 粒子')}</span>
        <button onClick={resetWorkbench} aria-label={language === 'en' ? 'Reset simulation' : '重置模拟'}><RotateCcw size={19} /></button>
        <button onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void containerRef.current?.requestFullscreen(); }} aria-label={language === 'en' ? 'Toggle fullscreen' : '切换全屏'}><Expand size={19} /></button>
        <i />
        <span>PNG STILL</span>
        <button className="fluid-export" onClick={exportPng}><ArrowDownToLine size={18} />{language === 'en' ? 'Export PNG' : '导出 PNG'}</button>
      </footer>
    </div>
  );
}
