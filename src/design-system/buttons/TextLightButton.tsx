import React from 'react';
import { Link } from 'react-router-dom';
import './buttons.css';

export interface TextLightButtonProps {
  children: React.ReactNode;
  to?: string;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  className?: string;
  showArrow?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

export const TextLightButton: React.FC<TextLightButtonProps> = ({
  children,
  to,
  href,
  onClick,
  className = '',
  showArrow = true,
  disabled = false,
  'aria-label': ariaLabel
}) => {
  const classes = ['lis-text-btn', disabled ? 'is-disabled' : '', className]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className="light-point-lead" aria-hidden="true" />
      <span>{children}</span>
      {showArrow && (
        <span className="text-arrow" aria-hidden="true">
          ↗
        </span>
      )}
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
      type="button"
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
