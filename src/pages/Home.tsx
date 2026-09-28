import { useRef,useState } from 'react';
import { Link } from 'react-router-dom';
import { homeProjects } from '../content';
import { ProjectCard,SectionTitle,TextLink,Arrow } from '../components/ui';
import { LightButton } from '../design-system';
import GoldParticleFlow from '../components/GoldParticleFlow';
import './home-motion.css';
import { useLanguage } from '../language';
import { localizeTeam } from '../content/team-en';
export function Hero() {
  const { pick } = useLanguage();
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
          <h2 className="hero-chinese-sub">{pick('以光，构筑空间。', 'LIGHT SHAPES SPACE.')}</h2>
          <p className="hero-tagline-desc">{pick('建筑化照明 · 媒体灯光 · 空间体验', 'Architectural lighting · Media facades · Spatial experience')}</p>
          <div className="hero-cta-action">
            <LightButton
              to="#selected"
              onClick={scrollToSelected}
              variant="primary"
              size="md"
              aria-label={pick('探索精选作品', 'Explore selected work')}
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
          <span className="hero-bottom-text">{pick('移动以点亮', 'MOVE TO ILLUMINATE')}</span>
        </div>
        <a
          href="#selected"
          onClick={scrollToSelected}
          className="hero-bottom-right"
        >
          <span className="hero-bottom-text">{pick('向下滚动，探索作品', 'SCROLL TO EXPLORE')}</span>
          <span className="hero-down-arrow">↓</span>
        </a>
      </div>
    </section>
  );
}
const expertise=[
  ['建筑照明','Architectural Lighting','从建筑的体量与材料出发，建立清晰的明暗层次。','Begin with architectural form and material to build clear layers of light and shadow.'],
  ['城市与景观','Urban & Landscape','让光连接建筑、自然与公共生活。','Connect architecture, nature and public life through light.'],
  ['媒体立面','Media Facade','探索建筑表皮与光的可变表达。','Explore changing expressions of the building envelope through light.'],
  ['空间体验','Spatial Experience','让光参与空间的叙事与感知。','Use light to shape how a space is perceived and experienced.'],
  ['光环境研究','Lighting Research','研究光、材料、健康与情绪之间的关系。','Study the relationships between light, materials, health and emotion.'],
  ['照明顾问','Lighting Consultancy','以策划、分析与后评估支持设计决策。','Support design decisions with strategy, analysis and post-occupancy review.']
];
export function Expertise(){const [active,setActive]=useState(0);const { language,pick }=useLanguage();const localizedTeam=localizeTeam(language);return <div className="expertise"><div className="expertise-intro"><span className="eyeline">{pick('建筑化照明','Architectural lighting')}</span><h2 data-reveal>{pick(<>光，从建筑<br/>出发。</>,<>Light begins<br/>with architecture.</>)}</h2><p>{localizedTeam.philosophy}</p><TextLink to="/about">{pick('了解我们的方法','Explore our approach')}</TextLink></div><div className="expertise-list">{expertise.map(([zh,en,descriptionZh,descriptionEn],i)=><div key={en} className={active===i?'active':''}><button onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} onClick={()=>setActive(i)} aria-expanded={active===i}><span className="number">0{i+1}</span><span>{pick(zh,en)}{language==='zh'&&<small>{en}</small>}</span><Arrow/></button>{active===i&&<p>{pick(descriptionZh,descriptionEn)}</p>}</div>)}</div></div>;}
export function Awards(){const {language,pick}=useLanguage();const localizedTeam=localizeTeam(language);return <div className="awards"><div className="eyeline">{pick('2020—2022 / 团队荣誉','2020—2022 / Studio awards')}</div><div className="award-numbers">{localizedTeam.awards.map(a=><div key={a.year}><span>{a.year}</span><strong>{a.count}<small>{pick('项',' awards')}</small></strong></div>)}</div><p className="muted">{localizedTeam.awardNames.join(' / ')}</p></div>;}
export default function Home(){const {language,pick}=useLanguage();const localizedTeam=localizeTeam(language);return <><div className="home-opening"><Hero/><GoldParticleFlow/><section className="section selected" id="selected"><SectionTitle english="SELECTED WORK" chinese="精选作品" masked><TextLink to="/work">{pick('全部 29 个项目','All 29 projects')}</TextLink></SectionTitle><div className="home-projects">{homeProjects.map((p,i)=><ProjectCard project={p} index={i} key={p.id} parallax/>)}</div></section></div><section className="section philosophy"><Expertise/></section><section className="section home-lab"><SectionTitle english="LIGHT LAB" chinese="光的实验室" masked/><div className="lab-invitation"><div><h3 data-reveal>{pick(<>在交互中，<br/>理解光与空间。</>,<>Explore light<br/>through interaction.</>)}</h3><p>{pick('移动一束光，观察空间的另一种表达。','Move a beam of light and see a different expression of space.')}</p><TextLink to="/lab">{pick('进入光的实验室','Enter the Light Lab')}</TextLink><small>{pick('概念交互演示','Interactive concept studies')}</small></div><div className="lab-entry-list">{[['field','光场','Light Field','01'],['pixel','像素立面','Pixel Facade','02'],['day','昼夜场景','Day / Night','03']].map(([id,zh,en,n])=><Link to={`/lab?mode=${id}`} key={id}><span>{n}</span>{pick(zh,en)}<Arrow/></Link>)}</div></div></section><section className="section home-about"><div className="split-copy"><h2 data-reveal>{pick(<>同济的底蕴。<br/>光的实践。</>,<>Rooted in Tongji.<br/>Working with light.</>)}</h2><div><p>{localizedTeam.intro}</p><TextLink to="/about">{pick('专业与团队','Expertise & team')}</TextLink></div></div><Awards/></section><section className="section contact-teaser"><h2 data-reveal>LET’S SHAPE<br/>THE NIGHT.</h2><div><p>{pick('通过光，创造下一个空间故事。','Let light shape the next spatial story.')}</p><TextLink to="/contact">{pick('联系我们','Contact us')}</TextLink></div></section></>;}
