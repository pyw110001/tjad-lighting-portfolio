import React from 'react';
import { Link } from 'react-router-dom';
import './cards.css';

export interface LightProjectCardProps {
  id?: string;
  name: string;
  slug?: string;
  categories?: string[];
  city?: string;
  coverImage: string;
  coverAlt?: string;
  badge?: string;
  kind?: string;
  index?: number;
  to?: string;
  className?: string;
  onClick?: () => void;
}

export const LightProjectCard: React.FC<LightProjectCardProps> = ({
  id,
  name,
  slug,
  categories = [],
  city,
  coverImage,
  coverAlt,
  badge,
  kind,
  index = 0,
  to,
  className = '',
  onClick,
}) => {
  const targetUrl = to || (slug ? `/work/${slug}` : '#');
  const indexStr = String(index + 1).padStart(2, '0');
  const displayBadge = badge || `TJAD · ${indexStr}`;

  return (
    <Link
      to={targetUrl}
      className={`lis-card-link-wrapper ${className}`}
      onClick={onClick}
      aria-label={`查看项目：${name}`}
      data-cursor="view"
      data-cursor-text="VIEW"
    >
      <article className="lis-card" data-reveal>
        <div className="lis-card-media-wrap">
          <span className="lis-card-header-badge">{displayBadge}</span>
          <div className="lis-card-action-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </div>
          <img
            src={coverImage}
            alt={coverAlt || name}
            className="lis-card-image"
            loading="lazy"
            decoding="async"
          />
          <div className="lis-card-overlay" aria-hidden="true" />
        </div>

        <div className="lis-card-body">
          <h3 className="lis-card-title">{name}</h3>
          {(categories.length > 0 || city) && (
            <div className="lis-card-meta">
              <span>{categories.join(' · ')}</span>
              {city && (
                <>
                  <span className="separator">/</span>
                  <span>{city}</span>
                </>
              )}
              {kind && (
                <>
                  <span className="separator">/</span>
                  <span className="kind">{kind}</span>
                </>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
};
