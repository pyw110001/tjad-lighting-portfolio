import { useState } from 'react';
import { projects } from '../content';
import { useLanguage } from '../language';

const ghibli = projects.find(project => project.id === 29)!;
const states = [
  { zh: '日景', en: 'Day', n: 5 },
  { zh: '暖色场景', en: 'Warm scene', n: 2 },
  { zh: '夜景', en: 'Night', n: 6 }
];

export default function DayNight() {
  const [active, setActive] = useState(0);
  const { pick } = useLanguage();
  return <div className="day-night"><div className="day-stage">{states.map((state, i) => {
    const media = ghibli.gallery.find(item => item.imageNumber === state.n)!;
    return <img key={media.id} src={media.src} width={media.width} height={media.height} className={active === i ? 'active' : ''} alt={`${pick('吉卜力的艺术世界', 'The Art of Ghibli World')} · ${pick(state.zh, state.en)}`} aria-hidden={active !== i} />;
  })}</div><div className="day-controls" aria-label={pick('照明状态', 'Lighting states')}>{states.map((state, i) => <button key={state.n} aria-pressed={active === i} onClick={() => setActive(i)}>{pick(state.zh, state.en)}</button>)}<button className="reset" onClick={() => setActive(0)}>{pick('重置', 'Reset')}</button></div><p aria-live="polite">{pick('当前状态：', 'Current state: ')}{pick(states[active].zh, states[active].en)}</p><small>{pick('原始场景图片 · 2018 年项目 / 2023 年画册。离散状态切换，不代表连续照明模拟。', 'Original scene images · 2018 project / 2023 portfolio. Discrete states; this is not a continuous lighting simulation.')}</small></div>;
}
