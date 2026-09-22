import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import './buttons.css';

export interface LightButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  showArrow?: boolean;
  href?: string;
  to?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
  target?: string;
  rel?: string;
}

export const LightButton: React.FC<LightButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  showArrow = true,
  href,
  to,
  onClick,
  className = '',
  'aria-label': ariaLabel,
  type = 'button',
  target,
  rel
}) => {
  const btnRef = useRef<HTMLElement>(null);

  const classes = [
    'lis-light-btn',
    `variant-${variant}`,
    `size-${size}`,
    disabled ? 'is-disabled' : '',
    loading ? 'is-loading' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className="lis-btn-beam" aria-hidden="true" />
      {loading ? (
        <span className="lis-btn-spinner" aria-hidden="true" />
      ) : (
        icon && <span className="lis-btn-icon">{icon}</span>
      )}
      <span className="lis-btn-label">
        <span className="lis-btn-label-inner">{children}</span>
      </span>
      {showArrow && !loading && (
        <span className="lis-btn-arrow" aria-hidden="true">
          ↗
        </span>
      )}
    </>
  );

  if (href || (to && to.startsWith('#'))) {
    return (
      <a
        ref={btnRef as React.RefObject<HTMLAnchorElement>}
        href={href || to}
        className={classes}
        data-magnetic
        target={target}
        rel={rel}
        aria-label={ariaLabel}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </a>
    );
  }

  if (to) {
    return (
      <Link
        ref={btnRef as React.RefObject<HTMLAnchorElement>}
        to={to}
        className={classes}
        data-magnetic
        aria-label={ariaLabel}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={btnRef as React.RefObject<HTMLButtonElement>}
      type={type}
      className={classes}
      disabled={disabled || loading}
      data-magnetic
      aria-label={ariaLabel}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
    >
      {content}
    </button>
  );
};
