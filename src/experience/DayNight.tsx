import { useState } from 'react';
import { projects } from '../content';
const ghibli=projects.find(p=>p.id===29)!;
const states=[{label:'日景',n:5},{label:'暖色场景',n:2},{label:'夜景',n:6}];
export default function DayNight(){const [active,setActive]=useState(0);return <div className="day-night"><div className="day-stage">{states.map((s,i)=>{const m=ghibli.gallery.find(m=>m.imageNumber===s.n)!;return <img key={m.id} src={m.src} width={m.width} height={m.height} className={active===i?'active':''} alt={`吉卜力的艺术世界 · ${s.label}`} aria-hidden={active!==i}/>;})}</div><div className="day-controls" aria-label="照明状态">{states.map((s,i)=><button key={s.n} aria-pressed={active===i} onClick={()=>setActive(i)}>{s.label}</button>)}<button className="reset" onClick={()=>setActive(0)}>重置</button></div><p aria-live="polite">当前状态：{states[active].label}</p><small>原始场景图片 · 2018 年项目 / 2023 年画册。离散状态切换，不代表连续照明模拟。</small></div>;}
