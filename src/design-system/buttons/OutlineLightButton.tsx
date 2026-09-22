import React from 'react';
import { Link } from 'react-router-dom';
import './buttons.css';

export interface OutlineLightButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  to?: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  icon?: React.ReactNode;
  'aria-label'?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const OutlineLightButton: React.FC<OutlineLightButtonProps> = ({
  children,
  disabled = false,
  to,
  href,
  onClick,
  className = '',
  icon,
  'aria-label': ariaLabel,
  type = 'button'
}) => {
  const classes = ['lis-outline-btn', disabled ? 'is-disabled' : '', className]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {icon && <span className="lis-btn-icon">{icon}</span>}
      <span>{children}</span>
    </>
  );

  if (to) {
    return (
      <Link
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

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        data-magnetic
        aria-label={ariaLabel}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      data-magnetic
      aria-label={ariaLabel}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
    >
      {content}
    </button>
  );
};
