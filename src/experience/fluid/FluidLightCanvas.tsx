import { useEffect, useRef, useState, useCallback } from 'react';
import { WebGPUFluidEngine, type FluidEngineConfig } from './WebGPUFluidEngine';
import { type FluidPaletteType, FLUID_PALETTE_INFO } from './fluidPalettes';
import { useGestureTracking } from './useGestureTracking';
import { useLabCopy } from '../../content/lab-en';
import { useLanguage } from '../../language';

interface FluidLightCanvasProps {
  initialPalette?: FluidPaletteType;
  onResetRequested?: (resetFn: () => void) => void;
}

export default function FluidLightCanvas({
  initialPalette = 'warm3000',
  onResetRequested
}: FluidLightCanvasProps) {
  const t = useLabCopy();
  const { language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGPUFluidEngine | null>(null);
  const syncActivityRef = useRef<(() => void) | null>(null);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [inputMode, setInputMode] = useState<'mouse' | 'gesture'>('mouse');
  const [currentPalette, setCurrentPalette] = useState<FluidPaletteType>(initialPalette);
  const [isPaused, setIsPaused] = useState(false);
  const [gravity, setGravity] = useState(-9.8);
  const [viscosity, setViscosity] = useState(0.85);
  const [particleRadius, setParticleRadius] = useState(3.5);
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
    const clientW = container?.clientWidth || 900;
    const clientH = container?.clientHeight || 560;
    canvas.width = Math.max(300, Math.floor(clientW * dpr));
    canvas.height = Math.max(200, Math.floor(clientH * dpr));

    const engine = new WebGPUFluidEngine({
      palette: currentPalette,
      gravity,
      viscosityStrength: viscosity,
      particleRadius
    });
    engineRef.current = engine;

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
      onResetRequested(() => engine.resetSimulation());
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

  // ResizeObserver for responsive canvas bounds
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry && engineRef.current) {
        const { width, height } = entry.contentRect;
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
      setShowPip(true);
      startGesture();
    } else {
      setInputMode('mouse');
      stopGesture();
    }
  }, [inputMode, startGesture, stopGesture]);

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
  };

  // Toggle Pause
  const handleTogglePause = () => {
    if (!engineRef.current) return;
    const paused = engineRef.current.togglePause();
    setIsPaused(paused);
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
  };

  // Viscosity change
  const handleViscosityChange = (val: number) => {
    setViscosity(val);
    engineRef.current?.updateConfig({ viscosityStrength: val });
  };

  // Particle size change
  const handleParticleRadiusChange = (val: number) => {
    setParticleRadius(val);
    engineRef.current?.updateConfig({ particleRadius: val });
  };

  // Fallback if WebGPU is unsupported
  if (supported === false) {
    return (
      <div className="card-viewport-wrap fluid-fallback-wrap">
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
      className="card-viewport-wrap fluid-viewport-container"
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

      {/* Vertical Toolbar (Left) */}
      <div className="viewport-toolbar-vertical" role="toolbar" aria-label={t("流光交互工具栏")}>
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

        {/* Pause / Play */}
        <button
          type="button"
          className="toolbar-btn"
          onClick={handleTogglePause}
          title={isPaused ? t("继续模拟") : t("暂停模拟")}
        >
          <span className="btn-icon">{isPaused ? '▶' : '❚❚'}</span>
          <span className="btn-label">{isPaused ? t("播放") : t("暂停")}</span>
        </button>
      </div>

      {/* Floating Gesture Luminous Cursor */}
      {inputMode === 'gesture' && cursorPos && (
        <div
          className={`gesture-luminous-cursor ${isPinching ? 'pinch-shockwave' : ''}`}
          style={{
            left: `${cursorPos.x * 100}%`,
            top: `${cursorPos.y * 100}%`
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
          />
          <span className="control-val">{particleRadius.toFixed(1)}</span>
        </div>

        {/* Performance Badge */}
        <div className="fluid-stats-pill">
          <span className="stat-dot" />
          <span>{engineRef.current ? `${engineRef.current.particleCount} ${t('微粒')}` : t("3,000+ 微粒")}</span>
          <span className="stat-divider">/</span>
          <span>{fps} FPS</span>
        </div>
      </div>
    </div>
  );
}
