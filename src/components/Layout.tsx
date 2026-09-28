import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { team } from '../content';
import { LightNavbar, FullscreenMenu, DEFAULT_NAV_ITEMS } from '../design-system';
import { useLanguage } from '../language';
import LanguageSwitch from './LanguageSwitch';

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { pick } = useLanguage();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  return (
    <>
      <a className="skip-link" href="#main">
        {pick('跳到主要内容', 'Skip to main content')}
      </a>
      <header className={`site-header ${open ? 'menu-open' : ''}`}>
        <Link to="/" className="brand" aria-label={pick('TJAD 建筑照明所首页', 'TJAD Architectural Lighting home')}>
          TJAD <span>/</span> <b>ARCHITECTURAL LIGHTING</b>
        </Link>
        <div className="header-actions">
          <div className="desktop-nav-wrap">
            <LightNavbar items={DEFAULT_NAV_ITEMS} />
          </div>
          <LanguageSwitch />
          <button
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="primary-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? pick('关闭', 'Close') : pick('菜单', 'Menu')}
            <span>{open ? '−' : '+'}</span>
          </button>
        </div>
      </header>

      {/* Fullscreen Curtain Menu (Mobile & Overlay) */}
      <FullscreenMenu
        isOpen={open}
        onClose={() => setOpen(false)}
        items={DEFAULT_NAV_ITEMS}
      />
    </>
  );
}

export function Footer() {
  const { pick } = useLanguage();
  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const main = document.getElementById('main');
    main?.focus({ preventScroll: true });
  };

  return (
    <footer className="site-footer">
      <div>
        <Link to="/" className="footer-brand">
          {pick('TJAD / 建筑照明所', 'TJAD / ARCHITECTURAL LIGHTING')}
        </Link>
        <p>
          {pick(team.fullName, 'Tongji Architectural Design (Group) Co., Ltd.')}
          <br />
          {pick(team.department, 'Specialized Technology Division · Architectural Lighting Studio')}
        </p>
      </div>
      <div className="footer-right">
        <span>LIGHT, AS ARCHITECTURE.</span>
        <small>{pick('作品及团队资料源自 2023 年画册', 'Project and team information from the 2023 portfolio')}</small>
        <a href="#main" onClick={scrollToTop}>
          {pick('返回顶部 ↑', 'Back to top ↑')}
        </a>
      </div>
    </footer>
  );
}
