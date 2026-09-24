import {
  lazy,
  Suspense,
  useEffect,
  useReducer,
  useRef,
  useState,
  useCallback
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fullLabReducer,
  initialFullLabState,
  type LabModuleId,
  type PixelPatternType,
  type LightSourceType,
  type ColorPresetType
} from '../experience/labState';
import { TextLink, Arrow } from '../components/ui';
import DayNightCompare from '../experience/DayNightCompare';
import { useActivity, canWebGL } from '../experience/useActivity';

const Scene = lazy(() => import('../experience/LightScene'));
const FluidLightCanvas = lazy(() => import('../experience/fluid/FluidLightCanvas'));

const modules: { id: LabModuleId; num: string; en: string; zh: string }[] = [
  { id: 'field', num: '01', en: 'Light Field', zh: '实时光场' },
  { id: 'pixel', num: '02', en: 'Pixel Facade', zh: '像素立面' },
  { id: 'day', num: '03', en: 'Day / Night', zh: '昼夜切换' },
  { id: 'color', num: '04', en: 'Color Studio', zh: '光色实验室' },
  { id: 'wave', num: '05', en: 'Fluid Light', zh: '流光粒子' }
];

export default function Lab() {
  const [params, setParams] = useSearchParams();
  const rawMode = params.get('mode');
  const activeMode: LabModuleId =
    rawMode === 'pixel' || rawMode === 'day' || rawMode === 'color' || rawMode === 'wave'
      ? rawMode
      : 'field';

  const [state, dispatch] = useReducer(fullLabReducer, {
    ...initialFullLabState,
    activeModule: activeMode
  });

  const waveResetRef = useRef<(() => void) | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [reduced, setReduced] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  const stageFieldRef = useRef<HTMLDivElement>(null);
  const stagePixelRef = useRef<HTMLDivElement>(null);
  const stageColorRef = useRef<HTMLDivElement>(null);

  const activeField = useActivity(stageFieldRef);
  const activePixel = useActivity(stagePixelRef);
  const activeColor = useActivity(stageColorRef);

  useEffect(() => {
    setSupported(canWebGL());
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const switchModule = useCallback(
    (id: LabModuleId) => {
      dispatch({ type: 'SET_MODULE', value: id });
      const next = new URLSearchParams(params);
      next.set('mode', id);
      setParams(next, { preventScrollReset: true });
      const el = document.getElementById(`lab-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [params, setParams]
  );

  // Capture Screenshot functionality for Guide step 4
  const captureScreenshot = useCallback(() => {
    try {
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length > 0) {
        // Find visible canvas with preserveDrawingBuffer
        const targetCanvas = Array.from(canvases).find(
          c => c.width > 300 && c.height > 200
        ) || canvases[0];

        const url = targetCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `TJAD-LightLab-${state.activeModule}-${Date.now()}.png`;
        a.click();
        setCopiedNote(true);
        setTimeout(() => setCopiedNote(false), 3000);
      }
    } catch {
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 3000);
    }
  }, [state.activeModule]);

  // Direction joystick in 01 Light Field
  const handleJoystickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
    dispatch({ type: 'FIELD_SET_ANGLE', value: [x, y] });
  };

  return (
    <div className="light-lab-page">
      {/* Top Header Hero with Celestial Sun Arc */}
      <section className="lab-hero-celestial">
        <div className="lab-hero-inner">
          <div className="lab-hero-branding">
            <span className="lab-tagline-top">TJAD ARCHITECTURAL LIGHTING</span>
            <span className="lab-index-indicator">05 / INTERACTIVE</span>
            <h1 className="lab-main-title">
              LIGHT LAB
              <span>光的实验室</span>
            </h1>
            <p className="lab-hero-intro">
              在这里，你可以亲手探索光与建筑的关系。通过交互实验，直观理解光如何塑造空间、激活立面、营造场景。
            </p>
            <div className="lab-hero-meta">Explore. Adjust. Experience.</div>
          </div>

          {/* Celestial Sun Arc Interactive Visualization */}
          <div className="lab-sun-arc-center">
            <div className="sun-arc-backdrop">
              <img
                src="/assets/brand/hero.webp"
                alt="建筑与光环境背景"
                className="arc-building-bg"
              />
              <svg
                className="celestial-arc-svg"
                viewBox="0 0 500 240"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M 40 220 Q 250 -30 460 220"
                  stroke="rgba(255, 255, 255, 0.28)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Draggable Sun Disc on the Arc */}
              <div
                className="sun-disc-handle"
                style={{
                  left: `${((state.lightField.time - 6) / 12) * 84 + 8}%`,
                  top: `${Math.pow(((state.lightField.time - 12) / 6), 2) * 58 + 14}%`
                }}
                title="日照太阳位置"
              >
                <div className="sun-pulse" />
                <div className="sun-core" />
              </div>
            </div>

            {/* Quick Navigation Anchor Tabs */}
            <nav className="lab-arc-nav" aria-label="实验快捷导航">
              {modules.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`arc-nav-item ${state.activeModule === m.id ? 'active' : ''}`}
                  onClick={() => switchModule(m.id)}
                >
                  <span className="nav-num">{m.num}</span>
                  <span className="nav-title">{m.en}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="lab-hero-motto">
            <p>
              光，
              <br />
              让建筑更有生命力。
            </p>
            <small>LIGHT GIVES ARCHITECTURE LIFE.</small>
            <div className="scroll-hint">
              <span>SCROLL TO EXPLORE</span>
              <div className="scroll-pill" />
            </div>
          </div>
        </div>
      </section>

      {/* Main 4-Experiment Grid Dashboard */}
      <main className="lab-dashboard-grid">
        {/* Module 01: LIGHT FIELD */}
        <section id="lab-field" className="lab-card card-field">
          <div className="card-header">
            <div className="card-titles">
              <h2>
                <span className="card-num">01</span> LIGHT FIELD{' '}
                <small>实时光场</small>
              </h2>
              <p>通过调整光源参数，观察建筑空间在不同光照条件下的变化。</p>
            </div>
            <button
              type="button"
              className="lab-reset-btn"
              onClick={() => dispatch({ type: 'RESET_FIELD' })}
              title="重置光场参数"
            >
              Reset ↺
            </button>
          </div>

          <div className="card-viewport-wrap" ref={stageFieldRef}>
            {supported === true ? (
              <Suspense
                fallback={
                  <img
                    className="lab-poster"
                    src="/assets/brand/lab.webp"
                    alt="建筑光场静态预览"
                  />
                }
              >
                <Scene
                  mode="field"
                  state={state}
                  active={activeField}
                  reduced={reduced}
                  onLost={() => setSupported(false)}
                />
              </Suspense>
            ) : (
              <img
                className="lab-poster"
                src="/assets/brand/lab.webp"
                alt="建筑光场静态预览"
              />
            )}

            {/* Left Vertical Lighting Tools */}
            <div className="viewport-toolbar-vertical" role="toolbar" aria-label="光源类型切换">
              {(
                [
                  ['sun', '太阳光', '☀'],
                  ['artificial', '人工光', '⚿'],
                  ['ambient', '环境光', '◈'],
                  ['model', '模型切换', '⬡']
                ] as [LightSourceType, string, string][]
              ).map(([type, label, icon]) => (
                <button
                  key={type}
                  type="button"
                  className={`toolbar-btn ${
                    state.lightField.lightType === type ? 'active' : ''
                  }`}
                  onClick={() => dispatch({ type: 'FIELD_SET_LIGHT_TYPE', value: type })}
                  title={label}
                  aria-pressed={state.lightField.lightType === type}
                >
                  <span className="btn-icon">{icon}</span>
                  <span className="btn-label">{label}</span>
                </button>
              ))}
            </div>

            {/* Bottom Timeline Slider (06:00 - 18:00) & Compass Joystick */}
            <div className="viewport-overlay-bottom">
              <div className="field-timeline-row">
                <span className="time-boundary">06:00</span>
                <input
                  type="range"
                  min="6"
                  max="18"
                  step="0.1"
                  value={state.lightField.time}
                  onChange={e =>
                    dispatch({
                      type: 'FIELD_SET_TIME',
                      value: parseFloat(e.target.value)
                    })
                  }
                  aria-label="日照时间轴"
                  className="field-timeline-slider"
                />
                <span className="time-boundary">18:00</span>
                <span className="current-time-badge">
                  {String(Math.floor(state.lightField.time)).padStart(2, '0')}:
                  {String(Math.round((state.lightField.time % 1) * 60)).padStart(2, '0')}
                </span>
              </div>

              {/* Direction Joystick Indicator */}
              <div
                className="compass-joystick"
                title="拖动调整光源方位"
                onPointerMove={e => {
                  if (e.buttons === 1) handleJoystickMove(e);
                }}
                onPointerDown={handleJoystickMove}
              >
                <div className="compass-cross" />
                <div
                  className="compass-knob"
                  style={{
                    left: `${(state.lightField.angle[0] * 0.5 + 0.5) * 100}%`,
                    top: `${(state.lightField.angle[1] * 0.5 + 0.5) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="card-features">
            <h4>功能亮点：</h4>
            <ul>
              <li>• 拖动时间轴，模拟日照角度与光影变化</li>
              <li>• 调整光源强度、色温、方向</li>
              <li>• 支持不同建筑模型（简约模型 / 场馆 / 街区）</li>
              <li>• 实时渲染光影与材质反射</li>
            </ul>
          </div>
        </section>

        {/* Module 02: PIXEL FACADE */}
        <section id="lab-pixel" className="lab-card card-pixel">
          <div className="card-header">
            <div className="card-titles">
              <h2>
                <span className="card-num">02</span> PIXEL FACADE{' '}
                <small>像素立面</small>
              </h2>
              <p>用像素化灯光，探索建筑立面的动态表达。</p>
            </div>
            <button
              type="button"
              className="lab-reset-btn"
              onClick={() => dispatch({ type: 'RESET_PIXEL' })}
              title="重置像素立面参数"
            >
              Reset ↺
            </button>
          </div>

          <div className="card-viewport-wrap" ref={stagePixelRef}>
            {supported === true ? (
              <Suspense fallback={<div className="lab-loading">加载立面模型...</div>}>
                <Scene
                  mode="pixel"
                  state={state}
                  active={activePixel}
                  reduced={reduced}
                  onLost={() => setSupported(false)}
                />
              </Suspense>
            ) : (
              <div className="lab-poster-fallback">像素立面需 WebGL 支持</div>
            )}

            {/* Left Pattern Selection Toolbar */}
            <div className="viewport-toolbar-vertical" role="toolbar" aria-label="立面动态效果选择">
              {(
                [
                  ['wave', '波浪', '∿'],
                  ['ripple', '涟漪', '◎'],
                  ['flow', '流动', '⫸'],
                  ['pattern', '图案', '▱'],
                  ['text', '文字', 'T']
                ] as [PixelPatternType, string, string][]
              ).map(([pat, label, icon]) => (
                <button
                  key={pat}
                  type="button"
                  className={`toolbar-btn ${
                    state.pixelFacade.pattern === pat ? 'active' : ''
                  }`}
                  onClick={() => dispatch({ type: 'PIXEL_SET_PATTERN', value: pat })}
                  title={label}
                  aria-pressed={state.pixelFacade.pattern === pat}
                >
                  <span className="btn-icon">{icon}</span>
                  <span className="btn-label">{label}</span>
                </button>
              ))}
            </div>

            {/* Bottom 5 Thumbnails Presets Bar */}
            <div className="viewport-overlay-bottom pixel-bottom-bar">
              <div className="pattern-presets-row">
                {(
                  [
                    ['wave', '波浪'],
                    ['ripple', '涟漪'],
                    ['flow', '流动'],
                    ['pattern', '晶格'],
                    ['text', 'TJAD']
                  ] as [PixelPatternType, string][]
                ).map(([pat, name]) => (
                  <button
                    key={pat}
                    type="button"
                    className={`preset-thumb-btn ${
                      state.pixelFacade.pattern === pat ? 'selected' : ''
                    }`}
                    onClick={() => dispatch({ type: 'PIXEL_SET_PATTERN', value: pat })}
                  >
                    <span className="thumb-preview" data-pattern={pat} />
                    <span className="thumb-label">{name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="preset-thumb-btn add-btn"
                  onClick={() => dispatch({ type: 'PIXEL_TOGGLE_PAUSE' })}
                  title={state.pixelFacade.paused ? '播放' : '暂停'}
                >
                  <span>{state.pixelFacade.paused ? '▶' : '❚❚'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="card-features">
            <h4>功能亮点：</h4>
            <ul>
              <li>• 多种动态效果（波浪 / 涟漪 / 流动 / 图案 / 文字）</li>
              <li>• 调整速度、亮度、颜色</li>
              <li>• 支持自定义图案或上传图片</li>
              <li>• 实时在建筑立面模型上预览效果</li>
            </ul>
          </div>
        </section>

        {/* Module 03: DAY / NIGHT */}
        <section id="lab-day" className="lab-card card-daynight">
          <div className="card-header">
            <div className="card-titles">
              <h2>
                <span className="card-num">03</span> DAY / NIGHT{' '}
                <small>昼夜切换</small>
              </h2>
              <p>在时间的流动中，感受建筑在不同时段的气质。</p>
            </div>
          </div>

          <div className="card-viewport-wrap daynight-wrap">
            <DayNightCompare
              state={state.dayNight}
              onChangeTime={t => dispatch({ type: 'DAYNIGHT_SET_TIME', value: t })}
              onChangeSplit={r => dispatch({ type: 'DAYNIGHT_SET_SPLIT', value: r })}
            />
          </div>

          <div className="card-features">
            <h4>功能亮点：</h4>
            <ul>
              <li>• 拖动时间轴查看不同时段的照明效果</li>
              <li>• 对比日景 / 黄昏 / 夜景的氛围</li>
              <li>• 可查看关键时段的灯光策略</li>
              <li>• 支持多个建筑案例场景切换</li>
            </ul>
          </div>
        </section>

        {/* Module 04: COLOR STUDIO */}
        <section id="lab-color" className="lab-card card-color">
          <div className="card-header">
            <div className="card-titles">
              <h2>
                <span className="card-num">04</span> COLOR STUDIO{' '}
                <small>光色实验室</small>
              </h2>
              <p>探索不同光色如何改变空间情绪。</p>
            </div>
          </div>

          <div className="card-viewport-wrap color-studio-wrap" ref={stageColorRef}>
            {/* 3D Visual showing the room tinted by the selected light */}
            <div className="color-preview-stage">
              {supported === true ? (
                <Suspense fallback={<div className="lab-loading">加载光色空间...</div>}>
                  <Scene
                    mode="color"
                    state={state}
                    active={activeColor}
                    reduced={reduced}
                    onLost={() => setSupported(false)}
                  />
                </Suspense>
              ) : (
                <div className="lab-poster-fallback">光色实验需 WebGL 支持</div>
              )}
            </div>

            {/* 4 Spatial Presets Cards */}
            <div className="color-presets-row" role="group" aria-label="选择空间光色预设">
              {(
                [
                  ['warm3000', '暖光 3000K', '#ffba6b', '温馨 · 沉静 · 亲和'],
                  ['neutral4000', '中性光 4000K', '#fff4d6', '明朗 · 纯净 · 商务'],
                  ['cool6000', '冷白光 6000K', '#d8f0ff', '高效 · 现代 · 通透'],
                  ['rgb', '彩色光', '#ba7bff', '艺术 · 戏剧 · 沉浸']
                ] as [ColorPresetType, string, string, string][]
              ).map(([key, name, color, tag]) => (
                <button
                  key={key}
                  type="button"
                  className={`color-preset-card ${
                    state.colorStudio.preset === key ? 'active' : ''
                  }`}
                  onClick={() => dispatch({ type: 'COLOR_SET_PRESET', value: key })}
                  aria-pressed={state.colorStudio.preset === key}
                >
                  <div
                    className="preset-swatch-bar"
                    style={{ backgroundColor: color }}
                  />
                  <strong>{name}</strong>
                  <small>{tag}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="card-features">
            <h4>功能亮点：</h4>
            <ul>
              <li>• 调整色温与颜色</li>
              <li>• 预设不同场景（展厅 / 办公 / 公共空间）</li>
              <li>• 观察空间氛围变化</li>
              <li>• 支持导出对比图</li>
            </ul>
          </div>
        </section>

        {/* Module 05: FLUID LIGHT / 流光粒子 */}
        <section id="lab-wave" className="lab-card card-wave">
          <div className="card-header">
            <div className="card-titles">
              <h2>
                <span className="card-num">05</span> FLUID LIGHT{' '}
                <small>流光粒子</small>
              </h2>
              <p>基于 WebGPU SPH 动力学与 AI 手势感应，探索建筑交互流光微粒。</p>
            </div>
            <button
              type="button"
              className="lab-reset-btn"
              onClick={() => {
                waveResetRef.current?.();
                dispatch({ type: 'RESET_WAVE' });
              }}
              title="重置流光粒子参数"
            >
              Reset ↺
            </button>
          </div>

          <Suspense fallback={<div className="lab-loading">加载 WebGPU 流光引擎...</div>}>
            <FluidLightCanvas
              initialPalette={state.fluidLight.palette}
              onResetRequested={fn => {
                waveResetRef.current = fn;
              }}
            />
          </Suspense>

          <div className="card-features">
            <h4>功能亮点：</h4>
            <ul>
              <li>• WebGPU GPU Compute 并行计算 3,000+ 流光微粒动力学</li>
              <li>• 鼠标光标漫游向心吸附，右键释放推散光浪</li>
              <li>• MediaPipe AI 隔空手势感知：食指导引流光、捏合手势推散冲击波</li>
              <li>• 4 组建筑级色温调色板（暖金 3000K / 极光冷白 6000K / 双色温 / 日光白）</li>
            </ul>
          </div>
        </section>

        {/* Bottom Right: User Workflow Guide */}
        <section className="lab-card card-guide">
          <div className="card-header">
            <h3>使用指引</h3>
            {copiedNote && (
              <span className="copied-toast" aria-live="polite">
                ✓ 实验画面已截取保存！
              </span>
            )}
          </div>

          <div className="guide-steps-grid">
            <div className="guide-step">
              <span className="step-num">1 选择模式</span>
              <div className="step-icon">⊞</div>
              <p>选择一个实验模块</p>
            </div>

            <div className="guide-step-arrow">→</div>

            <div className="guide-step">
              <span className="step-num">2 调整参数</span>
              <div className="step-icon">🎛</div>
              <p>通过鼠标或触控调整光源 / 效果</p>
            </div>

            <div className="guide-step-arrow">→</div>

            <div className="guide-step">
              <span className="step-num">3 观察变化</span>
              <div className="step-icon">👁</div>
              <p>实时查看建筑的光影与氛围</p>
            </div>

            <div className="guide-step-arrow">→</div>

            <div
              className="guide-step step-clickable"
              onClick={captureScreenshot}
              title="点击截取保存当前画面"
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && captureScreenshot()}
            >
              <span className="step-num">4 保存分享</span>
              <div className="step-icon">📷</div>
              <p>截取画面，分享你的光影实验</p>
            </div>
          </div>

          <div className="guide-footer">
            <TextLink to="/work">浏览精选作品工程档案</TextLink>
          </div>
        </section>
      </main>
    </div>
  );
}
