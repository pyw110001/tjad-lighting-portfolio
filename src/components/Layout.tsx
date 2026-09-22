import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { team } from '../content';
import { LightNavbar, FullscreenMenu, DEFAULT_NAV_ITEMS } from '../design-system';

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

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
        跳到主要内容
      </a>
      <header className={`site-header ${open ? 'menu-open' : ''}`}>
        <Link to="/" className="brand" aria-label="TJAD 建筑照明所首页">
          TJAD <span>/</span> <b>ARCHITECTURAL LIGHTING</b>
        </Link>
        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? '关闭' : '菜单'}
          <span>{open ? '−' : '+'}</span>
        </button>

        {/* Desktop Light Navbar */}
        <div className="desktop-nav-wrap">
          <LightNavbar items={DEFAULT_NAV_ITEMS} />
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
          TJAD / 建筑照明所
        </Link>
        <p>
          {team.fullName}
          <br />
          {team.department}
        </p>
      </div>
      <div className="footer-right">
        <span>LIGHT, AS ARCHITECTURE.</span>
        <small>作品及团队资料源自 2023 年画册</small>
        <a href="#main" onClick={scrollToTop}>
          返回顶部 ↑
        </a>
      </div>
    </footer>
  );
}
