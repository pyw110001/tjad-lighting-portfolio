import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header, Footer } from './components/Layout';
import { PageEffects, Intro } from './components/Effects';
import { UnifiedMagneticCursor } from './design-system';
import Home from './pages/Home';
import Work from './pages/Work';
import About from './pages/About';
import Contact from './pages/Contact';
import ProjectDetail from './pages/ProjectDetail';
import Lab from './pages/Lab';
import UIShowcase from './pages/UIShowcase';
import NotFound from './pages/NotFound';
import { projects } from './content';

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    const p = projects.find((p) => pathname === `/work/${p.slug}`);
    const names: Record<string, string> = {
      '/': 'Light, as Architecture.',
      '/work': '作品档案',
      '/about': '专业与团队',
      '/lab': '光的实验室',
      '/contact': '联系',
      '/ui-showcase': 'UI 组件库与设计系统',
    };
    document.title = `${p?.name || names[pathname] || '页面未找到'} — TJAD 建筑照明所`;
  }, [pathname]);

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
      {pathname === '/' && <Intro />}
    </>
  );
}
