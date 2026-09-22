import { lazy,Suspense,useEffect,useRef,useState } from 'react';
import { Link } from 'react-router-dom';
import { homeProjects,team } from '../content';
import { ProjectCard,SectionTitle,TextLink,Arrow } from '../components/ui';
import { LightButton } from '../design-system';
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [isMoving, setIsMoving] = useState(false);
  const moveTimeoutRef = useRef<number | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    ref.current.style.setProperty('--pointer-x', `${x}`);
    ref.current.style.setProperty('--pointer-y', `${y}`);
    setIsMoving(true);
    if (moveTimeoutRef.current) window.clearTimeout(moveTimeoutRef.current);
    moveTimeoutRef.current = window.setTimeout(() => setIsMoving(false), 900);
  };

  const scrollToSelected = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById('selected');
    target?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      className="hero"
      ref={ref}
      onPointerMove={handlePointerMove}
    >
      <div className="hero-split-body">
        <div className="hero-copy-column">
          <span className="hero-eyebrow">ARCHITECTURE / LIGHT / EXPERIENCE</span>
          <h1 className="hero-main-title">LIGHT GIVES FORM.</h1>
          <h2 className="hero-chinese-sub">以光，构筑空间。</h2>
          <p className="hero-tagline-desc">建筑化照明 · 媒体灯光 · 空间体验</p>
          <div className="hero-cta-action">
            <LightButton
              to="#selected"
              onClick={scrollToSelected}
              variant="primary"
              size="md"
              aria-label="探索精选作品"
            >
              EXPLORE OUR WORK
            </LightButton>
          </div>
        </div>

        <div className="hero-portal-column">
          <div className="hero-portal-card">
            <img
              className="hero-portal-img"
              src="/assets/brand/hero-portal.webp"
              width="896"
              height="1200"
              alt="Architectural portal illuminated by warm vertical light slit"
              fetchPriority="high"
            />
            <div className="hero-portal-glare" aria-hidden="true" />
            <div className="hero-portal-shimmer" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="hero-bottom-bar">
        <div className={`hero-bottom-left ${isMoving ? 'active' : ''}`}>
          <span className="hero-illuminate-dot" />
          <span className="hero-bottom-text">MOVE TO ILLUMINATE</span>
        </div>
        <a
          href="#selected"
          onClick={scrollToSelected}
          className="hero-bottom-right"
        >
          <span className="hero-bottom-text">SCROLL TO EXPLORE</span>
          <span className="hero-down-arrow">↓</span>
        </a>
      </div>
    </section>
  );
}
const expertise=[['建筑照明','Architectural Lighting','从建筑的体量与材料出发，建立清晰的明暗层次。'],['城市与景观','Urban & Landscape','让光连接建筑、自然与公共生活。'],['媒体立面','Media Facade','探索建筑表皮与光的可变表达。'],['空间体验','Spatial Experience','让光参与空间的叙事与感知。'],['光环境研究','Lighting Research','研究光、材料、健康与情绪之间的关系。'],['照明顾问','Lighting Consultancy','以策划、分析与后评估支持设计决策。']];
export function Expertise(){const [active,setActive]=useState(0);return <div className="expertise"><div className="expertise-intro"><span className="eyeline">建筑化照明</span><h2 data-reveal>光，从建筑<br/>出发。</h2><p>{team.philosophy}</p><TextLink to="/about">了解我们的方法</TextLink></div><div className="expertise-list">{expertise.map(([zh,en,description],i)=><div key={en} className={active===i?'active':''}><button onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} onClick={()=>setActive(i)} aria-expanded={active===i}><span className="number">0{i+1}</span><span>{zh}<small>{en}</small></span><Arrow/></button>{active===i&&<p>{description}</p>}</div>)}</div></div>;}
export function Awards(){return <div className="awards"><div className="eyeline">2020—2022 / 团队荣誉</div><div className="award-numbers">{team.awards.map(a=><div key={a.year}><span>{a.year}</span><strong>{a.count}<small>项</small></strong></div>)}</div><p className="muted">{team.awardNames.join('　/　')}</p></div>;}
export default function Home(){return <><Hero/><section className="section selected" id="selected"><SectionTitle english="SELECTED WORK" chinese="精选作品"><TextLink to="/work">全部 29 个项目</TextLink></SectionTitle><div className="home-projects">{homeProjects.map((p,i)=><ProjectCard project={p} index={i} key={p.id} parallax/>)}</div></section><section className="section philosophy"><Expertise/></section><section className="section home-lab"><SectionTitle english="LIGHT LAB" chinese="光的实验室"/><div className="lab-invitation"><div><h3 data-reveal>在交互中，<br/>理解光与空间。</h3><p>移动一束光，观察空间的另一种表达。</p><TextLink to="/lab">进入光的实验室</TextLink><small>概念交互演示</small></div><div className="lab-entry-list">{[['field','光场','01'],['pixel','像素立面','02'],['day','昼夜场景','03']].map(([id,name,n])=><Link to={`/lab?mode=${id}`} key={id}><span>{n}</span>{name}<Arrow/></Link>)}</div></div></section><section className="section home-about"><div className="split-copy"><h2 data-reveal>同济的底蕴。<br/>光的实践。</h2><div><p>{team.intro}</p><TextLink to="/about">专业与团队</TextLink></div></div><Awards/></section><section className="section contact-teaser"><h2 data-reveal>LET’S SHAPE<br/>THE NIGHT.</h2><div><p>通过光，创造下一个空间故事。</p><TextLink to="/contact">联系我们</TextLink></div></section></>;}
