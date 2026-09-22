import React from 'react';
import './buttons.css';

export interface GlowIconButtonProps {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const GlowIconButton: React.FC<GlowIconButtonProps> = ({
  icon,
  children,
  onClick,
  active = false,
  disabled = false,
  title,
  'aria-label': ariaLabelProp,
  ariaLabel,
  className = '',
  size = 'md',
}) => {
  const finalAriaLabel = ariaLabelProp || ariaLabel || title || 'icon button';
  const classes = [
    'lis-icon-btn',
    `size-${size}`,
    active ? 'is-active' : '',
    disabled ? 'is-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      onClick={onClick}
      title={title || finalAriaLabel}
      aria-label={finalAriaLabel}
      aria-pressed={active}
      data-magnetic
    >
      {icon || children}
    </button>
  );
};
