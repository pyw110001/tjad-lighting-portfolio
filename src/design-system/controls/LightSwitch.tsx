import React from 'react';
import './controls.css';

export interface LightSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const LightSwitch: React.FC<LightSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
  id,
}) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`lis-switch-btn ${checked ? 'is-checked' : ''} ${
        disabled ? 'is-disabled' : ''
      } ${className}`}
      data-magnetic
    >
      <div className="lis-switch-track" aria-hidden="true">
        <div className="lis-switch-thumb" />
      </div>
      {label && <span className="lis-switch-label">{label}</span>}
    </button>
  );
};
