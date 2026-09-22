import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { GlowIconButton } from '../buttons/GlowIconButton';
import { DEFAULT_NAV_ITEMS, type NavItemConfig } from './LightNavbar';
import './navigation.css';

export interface FullscreenMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items?: NavItemConfig[];
  className?: string;
}

export const FullscreenMenu: React.FC<FullscreenMenuProps> = ({
  isOpen,
  onClose,
  items = DEFAULT_NAV_ITEMS,
  className = '',
}) => {
  const [hoveredImage, setHoveredImage] = useState<string>(
    items[0]?.previewImage || '/assets/projects/01-the-bund.webp'
  );

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      className={`lis-fullscreen-menu ${isOpen ? 'is-open' : ''} ${className}`}
      aria-hidden={isOpen ? undefined : true}
      role="dialog"
      aria-modal="true"
      aria-label="全屏导航菜单"
    >
      {/* Light Curtains */}
      <div className="lis-menu-curtains" aria-hidden="true">
        <i style={{ animationDelay: '0ms' }} />
        <i style={{ animationDelay: '80ms' }} />
        <i style={{ animationDelay: '160ms' }} />
        <i style={{ animationDelay: '240ms' }} />
      </div>

      <div className="lis-menu-close-btn">
        <GlowIconButton
          onClick={onClose}
          aria-label="关闭菜单"
          size="lg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </GlowIconButton>
      </div>

      <div className="lis-menu-body">
        <nav id="primary-nav" className="lis-menu-links open" aria-label="全屏主导航">
          {items.map((item, index) => {
            const numStr = String(index + 1).padStart(2, '0');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `lis-menu-link-item ${isActive ? 'is-active' : ''}`}
                onClick={onClose}
                onMouseEnter={() => {
                  if (item.previewImage) setHoveredImage(item.previewImage);
                }}
                aria-label={item.labelZh}
              >
                <span className="menu-num">/{numStr}</span>
                <span className="menu-en">{item.labelEn}</span>
                <span className="menu-zh">{item.labelZh}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="lis-menu-preview-pane" aria-hidden="true">
          {hoveredImage && (
            <img
              key={hoveredImage}
              src={hoveredImage}
              alt=""
              className="lis-menu-preview-img"
              loading="lazy"
            />
          )}
        </div>
      </div>
    </div>
  );
};
