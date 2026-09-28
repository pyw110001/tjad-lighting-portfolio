import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header, Footer } from './components/Layout';
import { PageEffects } from './components/Effects';
import { UnifiedMagneticCursor } from './design-system';
import { LanguageProvider, useLanguage } from './language';
import Home from './pages/Home';
import Work from './pages/Work';
import About from './pages/About';
import Contact from './pages/Contact';
import ProjectDetail from './pages/ProjectDetail';
import Lab from './pages/Lab';
import UIShowcase from './pages/UIShowcase';
import NotFound from './pages/NotFound';
import { projects } from './content';
import { localizeProject } from './content/project-en';

function AppContent() {
  const { pathname } = useLocation();
  const { language, pick } = useLanguage();

  useEffect(() => {
    const p = projects.find((p) => pathname === `/work/${p.slug}`);
    const names: Record<string, string> = {
      '/': pick('以光，构筑空间。', 'Light, as Architecture.'),
      '/work': pick('作品档案', 'Work Archive'),
      '/about': pick('专业与团队', 'Practice & Team'),
      '/lab': pick('光的实验室', 'Light Lab'),
      '/contact': pick('联系', 'Contact'),
      '/ui-showcase': pick('UI 组件库与设计系统', 'UI Showcase'),
    };
    document.title = `${p ? localizeProject(p, language).name : names[pathname] || pick('页面未找到', 'Page Not Found')} — ${pick('TJAD 建筑照明所', 'TJAD Architectural Lighting')}`;
  }, [pathname, language, pick]);

  return (
    <>
      <Header />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/work" element={<Work />} />
          <Route path="/work/:slug" element={<ProjectDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/ui-showcase" element={<UIShowcase />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <PageEffects />
      <UnifiedMagneticCursor />
    </>
  );
}

export default function App() {
  return <LanguageProvider><AppContent /></LanguageProvider>;
}
