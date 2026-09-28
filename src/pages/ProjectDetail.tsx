import { Link, useParams } from 'react-router-dom';
import { projects } from '../content';
import { localizeProject } from '../content/project-en';
import { Media, Gallery, TextLink } from '../components/ui';
import { useLanguage } from '../language';
import NotFound from './NotFound';
import DayNight from '../experience/DayNight';

export default function ProjectDetail() {
  const { slug } = useParams();
  const { language, pick } = useLanguage();
  const source = projects.find(p => p.slug === slug);
  if (!source) return <NotFound />;
  const project = localizeProject(source, language);
  const next = localizeProject(projects[source.id % projects.length], language);
  const awards = language === 'en'
    ? project.facts.Awards
    : project.facts['项目获奖'] || project.facts['荣誉获奖'];

  return <article className="section page detail-page">
    <div className="breadcrumb"><Link to="/work">{pick('作品', 'Work')}</Link><span>/</span>{project.name}</div>
    <h1>{project.name}</h1>
    <p className="detail-subtitle">{language === 'zh' && <>{project.english} <span> / </span> </>}{project.city}</p>
    <div className="detail-top">
      <figure><Media media={project.cover} priority /><figcaption>{project.cover.kind} · {pick('2023 年画册', '2023 portfolio')}</figcaption></figure>
      <aside><h2>{pick('项目档案', 'Project details')}</h2><dl>{Object.entries(project.facts).filter(([key]) => !['项目获奖', '荣誉获奖', 'Awards'].includes(key)).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}{language === 'zh' && /施工中|设计中/.test(value) && <small>2023 年画册记录</small>}</dd></div>)}</dl></aside>
    </div>
    <section className="detail-intro"><h2 data-reveal>{pick('光与场所。', 'Light and place.')}</h2><div><h3>{project.fullName}</h3><p>{project.summary}</p><small className="muted">{pick('项目简介依据画册元信息整理。', 'Project introduction based on portfolio metadata.')}</small>{project.note && <p className="source-note">{project.note}</p>}{awards && <p className="project-awards">{pick('项目获奖：', 'Awards: ')}{awards}</p>}</div></section>
    {project.analysis.length > 0 && <section className="analysis-section"><h2>{pick('照明解读', 'Lighting analysis')}</h2><div><p className="source-note">{pick('以下为依据画册图文整理的分析，非画册原文；其中技术策略与运行模式未经独立工程核验。', 'The following analysis is based on portfolio images and text, not reproduced from the source. Technical strategies and operating modes have not been independently verified.')}</p>{project.analysis.map((paragraph, i) => <p key={i}><span className="number">0{i + 1}</span>{paragraph}</p>)}</div></section>}
    <section className="project-gallery"><div className="section-title"><h2>PROJECT GALLERY{language === 'zh' && <span>项目图集</span>}</h2><small>{project.gallery.length} {pick('幅图像', 'images')}</small></div><Gallery items={project.gallery} /></section>
    {project.lab === 'day' ? <section className="project-day"><h2>{pick('同一场景，不同的光。', 'One scene, different light.')}</h2><p>{pick('画册中的离散照明状态，点击切换观察。', 'Switch between the lighting states shown in the portfolio.')}</p><DayNight /></section> : project.lab && <div className="related-lab"><div><h2>{pick('从作品，走向光的实验。', 'Explore light beyond the project.')}</h2><p>{pick('体验独立像素立面概念演示，非本项目实际灯控程序。', 'Explore an independent pixel facade concept, not this project’s lighting control system.')}</p></div><TextLink to={`/lab?mode=${project.lab}`}>{pick('进入实验室', 'Enter the Light Lab')}</TextLink></div>}
    <details className="sources"><summary>{pick('查看资料来源', 'View sources')}</summary><p>{pick(`资料版本：${project.sourceYear} 年团队画册。项目图像包含方案效果图与项目影像，日期及状态不代表当前进展。`, `Source: ${project.sourceYear} studio portfolio. Images include design visualizations and project photography; dates and statuses do not indicate current progress.`)}</p><a href={project.sourceUrl} target="_blank" rel="noreferrer">{pick('项目原始文字资料 ↗', 'Original project text ↗')}</a>{project.extraSource && <a href={project.extraSource} target="_blank" rel="noreferrer">{pick('精选案例整理分析 ↗', 'Selected case analysis ↗')}</a>}{project.reference && <a href={project.reference.src} target="_blank" rel="noreferrer">{pick('画册原版面 ↗', 'Original portfolio page ↗')}</a>}</details>
    <div className="next-project"><span className="eyeline">{pick('NEXT PROJECT / 下一项目', 'NEXT PROJECT')}</span><TextLink to={`/work/${next.slug}`}>{next.name}</TextLink></div>
  </article>;
}
