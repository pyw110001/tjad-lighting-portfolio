import { useState, useRef, useEffect, useCallback } from 'react';
import type { DayNightState } from './labState';

interface Props {
  state: DayNightState;
  onChangeTime: (time: number) => void;
  onChangeSplit: (ratio: number) => void;
}

const keyframes = [
  { time: 6.5, label: '06:00', title: '清晨自然采光', desc: '利用晨光与天窗深邃开洞，自然漫射光渗透室内。' },
  { time: 12.0, label: '12:00', title: '正午顶光抑制', desc: '强日照时段，百叶与深挑檐阻断直射眩光。' },
  { time: 18.0, label: '18:00', title: '黄昏泛光初启', desc: '室内透光渐显，建筑内外明暗交界形成柔和层次。' },
  { time: 19.5, label: '19:30', title: '夜景重点照明', desc: '泛光与立面轮廓全开，倒影与天际线产生戏剧性对话。' },
  { time: 24.0, label: '24:00', title: '深夜节能模式', desc: '关闭高功率立面泛光，保留安全导向与轮廓呼吸微光。' }
];

export default function DayNightCompare({ state, onChangeTime, onChangeSplit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateSplitFromPointer = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawRatio = (clientX - rect.left) / rect.width;
      const ratio = Math.max(0.04, Math.min(0.96, rawRatio));
      onChangeSplit(ratio);
    },
    [onChangeSplit]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        updateSplitFromPointer(e.clientX);
      }
    };
    const handlePointerUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, updateSplitFromPointer]);

  // Current lighting strategy based on time
  const currentStrategy =
    state.time < 11
      ? keyframes[0]
      : state.time < 16.5
        ? keyframes[1]
        : state.time < 18.5
          ? keyframes[2]
          : state.time < 22.5
            ? keyframes[3]
            : keyframes[4];

  // Calculate day-night blend opacity for time
  // daytime: 6:00 to 17:00 (opacity near 0 for night overlay)
  // sunset: 17:00 to 19:00 (crossfade)
  // night: 19:00 to 24:00 (night overlay active)
  const nightAlpha = Math.max(
    0,
    Math.min(1, (state.time - 16.5) / 2.5)
  );

  return (
    <div className="daynight-compare-module">
      <div
        ref={containerRef}
        className="compare-stage"
        onPointerDown={e => {
          setIsDragging(true);
          updateSplitFromPointer(e.clientX);
        }}
      >
        {/* Left Layer: Daytime Visual */}
        <div className="compare-layer layer-day">
          <img
            src="/assets/projects/century-square/01_图-1425.webp"
            alt="建筑日景自然采光"
            className="compare-img"
          />
          <div className="day-ambient-glaze" />
          <span className="compare-badge badge-day">☀ Day 06:30</span>
        </div>

        {/* Right Layer: Nighttime Visual with clip-path */}
        <div
          className="compare-layer layer-night"
          style={{
            clipPath: `polygon(${state.splitRatio * 100}% 0, 100% 0, 100% 100%, ${
              state.splitRatio * 100
            }% 100%)`
          }}
        >
          <img
            src="/assets/projects/wanping-theatre/01_图-1455.webp"
            alt="建筑夜景人工照明"
            className="compare-img"
          />
          <div
            className="night-lighting-sheen"
            style={{ opacity: 0.35 + nightAlpha * 0.65 }}
          />
          <span className="compare-badge badge-night">☾ Night 19:30</span>
        </div>

        {/* Split Divider Handle */}
        <div
          className="compare-divider"
          style={{ left: `${state.splitRatio * 100}%` }}
          aria-label="拖动对比日景与夜景"
        >
          <div className="divider-line" />
          <button
            type="button"
            className="divider-thumb"
            aria-label="拖动滑块对比昼夜照明"
            onKeyDown={e => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                onChangeSplit(Math.max(0.04, state.splitRatio - 0.05));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                onChangeSplit(Math.min(0.96, state.splitRatio + 0.05));
              }
            }}
          >
            <span>&lt;&gt;</span>
          </button>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="compare-controls">
        <div className="compare-timeline-bar">
          <input
            type="range"
            min="6"
            max="24"
            step="0.25"
            value={state.time}
            onChange={e => onChangeTime(parseFloat(e.target.value))}
            aria-label="昼夜时间轴"
            className="compare-timeline-slider"
          />
          <div className="compare-timeline-ticks">
            {keyframes.map(k => (
              <button
                type="button"
                key={k.label}
                className={`timeline-tick ${Math.abs(state.time - k.time) < 1.2 ? 'active' : ''}`}
                onClick={() => onChangeTime(k.time)}
              >
                <span>{k.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="strategy-card">
          <div className="strategy-header">
            <strong>{currentStrategy.title}</strong>
            <span className="strategy-time">
              {String(Math.floor(state.time)).padStart(2, '0')}:
              {String(Math.round((state.time % 1) * 60)).padStart(2, '0')}
            </span>
          </div>
          <p>{currentStrategy.desc}</p>
        </div>
      </div>
    </div>
  );
}
