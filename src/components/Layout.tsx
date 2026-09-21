import { useEffect,useState } from 'react';
import { Link,NavLink,useLocation } from 'react-router-dom';
import { team } from '../content';
const nav = [
  ['/about', 'ABOUT', '专业与团队'],
  ['/work', 'WORK', '作品'],
  ['/lab', 'LAB', '光的实验室'],
  ['/contact', 'CONTACT', '联系']
] as const;
export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
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
        <nav id="primary-nav" className={open ? 'open' : ''} aria-label="主导航">
          {nav.map(([to, labelEn, labelZh]) => (
            <NavLink key={to} to={to} data-magnetic aria-label={labelZh}>
              <span className="nav-en">{labelEn}</span>
              <span className="nav-zh">{labelZh}</span>
            </NavLink>
          ))}
        </nav>
      </header>
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
