import { allMedia } from '../content';
import { localizeTeam } from '../content/team-en';
import { Awards } from './Home';
import { TextLink, Media } from '../components/ui';
import { useLanguage } from '../language';

export default function About() {
  const { language, pick } = useLanguage();
  const team = localizeTeam(language);
  const image = allMedia.find(m => m.id === 'team-6-02_图')!;
  return <section className="section page about-page">
    <div className="about-top"><div><h1>{pick('光，从建筑出发。', 'Light begins with architecture.')}</h1><h2 className="gold">{pick('建筑化照明', 'Architectural lighting')}</h2></div><div><p className="lead">{team.philosophy}</p><p>{team.intro}</p></div></div>
    <div className="service-columns">{team.services.map((service, i) => <div key={service.title}><span className="number">0{i + 1}</span><h2>{service.title}</h2><ul>{service.items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div>
    <Awards />
    <div className="director"><div><span className="eyeline">{pick('团队负责人 / 2023 年画册资料', 'Studio director / 2023 portfolio')}</span><h2>{team.director}{language === 'zh' && <span>博士</span>}</h2><p className="gold">{pick('建筑照明所所长', 'Director, Architectural Lighting Studio')}</p><p>{team.directorBio}</p><p>{pick('2021 年度全球 40 位 40 岁以下最有影响力照明设计师。', 'Named among the 40 most influential lighting designers under 40 worldwide in 2021.')}</p></div><div className="director-research"><h3>{pick('以研究，支持实践。', 'Research informs practice.')}</h3><p>{pick('参与科研课题 10 余项，发表论文 20 多篇，参与编辑专著 3 部。', 'Contributed to more than 10 research projects, published over 20 papers and co-edited three books.')}</p><p className="muted">{pick('研究覆盖视觉艺术与视觉功效、光健康、建筑照明与城市光环境。以上为 2023 年画册记载。', 'Research covers visual arts and performance, light and health, architectural lighting and urban light environments. Figures are from the 2023 portfolio.')}</p><a className="text-link" href="/sources/team-5.md" target="_blank" rel="noreferrer">{pick('查看履历资料 ↗', 'View biography source ↗')}</a></div></div>
    <div className="group-story"><Media media={{ ...image, alt: pick(image.alt, 'Tongji Design Group team') }} /><div><span className="eyeline">{pick('同济设计集团', 'Tongji Design Group')}</span><h2>{pick(<>建筑的理解，<br/>来自共同的实践。</>, <>Understanding architecture<br/>through shared practice.</>)}</h2><p>{team.fullName}</p><p className="muted">{pick('1958 年，同济大学土木建筑设计院成立。1979—2007 年为同济大学建筑设计研究院，2008 年起采用集团名称。', 'Tongji University’s Civil and Architectural Design Institute was founded in 1958. It operated as the Tongji University Architectural Design Institute from 1979 to 2007 and adopted the group name in 2008.')}</p><p className="muted">{pick('画册记录集团具备建筑行业甲级等设计资质；照明所设立于集团专项技术事业部。', 'The portfolio records the group’s Class A architecture qualifications. The lighting studio belongs to its Specialized Technology Division.')}</p><TextLink to="/work">{pick('探索代表作品', 'Explore selected work')}</TextLink></div></div>
    <details className="sources"><summary>{pick('资料来源与年份', 'Sources and dates')}</summary><p>{pick('页面依据 2023 年团队画册整理，职务、资质与统计均保留资料年份。', 'This page is based on the 2023 studio portfolio. Roles, qualifications and statistics reflect the year of that source.')}</p>{team.sources.map((source, i) => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{language === 'en' ? ['Studio introduction', 'Studio awards', 'Services', 'Lighting typologies', 'Studio director', 'Group background and qualifications'][i] : source.name.replace(/^\d+_/, '').replace('.md', '')} ↗</a>)}</details>
  </section>;
}
