import { TextLink } from '../components/ui';
import { useLanguage } from '../language';

export default function NotFound() {
  const { pick } = useLanguage();
  return <section className="section page not-found"><span className="eyeline">404</span><h1>{pick('这里，暂未点亮。', 'This space is not yet illuminated.')}</h1><p>{pick('页面可能已移动，或链接有误。', 'The page may have moved, or the link may be incorrect.')}</p><div><TextLink to="/work">{pick('探索作品', 'Explore work')}</TextLink><TextLink to="/">{pick('返回首页', 'Back to home')}</TextLink></div></section>;
}
