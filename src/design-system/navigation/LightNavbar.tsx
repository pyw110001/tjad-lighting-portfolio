import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import './navigation.css';

export interface NavItemConfig {
  to: string;
  labelEn: string;
  labelZh: string;
  previewImage?: string;
}

export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { to: '/about', labelEn: 'ABOUT', labelZh: '专业与团队', previewImage: '/assets/team/team-1/00_版面图-960.webp' },
  { to: '/work', labelEn: 'WORK', labelZh: '作品', previewImage: '/assets/projects/the-bund/01_图-1159.webp' },
  { to: '/lab', labelEn: 'LAB', labelZh: '光的实验室', previewImage: '/assets/brand/hero.webp' },
  { to: '/contact', labelEn: 'CONTACT', labelZh: '联系', previewImage: '/assets/projects/museum-of-art-pudong/01_图-767.webp' },
];

export interface LightNavbarProps {
  items?: NavItemConfig[];
  onOpenMenu?: () => void;
  isMenuOpen?: boolean;
  className?: string;
}

export const LightNavbar: React.FC<LightNavbarProps> = ({
  items = DEFAULT_NAV_ITEMS,
  onOpenMenu,
  isMenuOpen = false,
  className = '',
}) => {
  return (
    <nav className={`lis-navbar ${className}`} aria-label="主导航">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `lis-nav-item ${isActive ? 'is-active' : ''}`}
          aria-label={item.labelZh}
          data-magnetic
        >
          <span className="lis-nav-text">{item.labelEn}</span>
          <span className="lis-nav-dot" aria-hidden="true" />
        </NavLink>
      ))}
    </nav>
  );
};
