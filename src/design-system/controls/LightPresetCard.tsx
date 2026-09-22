import React from 'react';
import './controls.css';

export interface LightPresetCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  active?: boolean;
  selected?: boolean;
  onClick?: () => void;
  beamType?: 'accent' | 'wall-wash' | 'flood' | 'linear';
  beamAngle?: number;
  className?: string;
}

export const LightPresetCard: React.FC<LightPresetCardProps> = ({
  title,
  subtitle,
  icon,
  active = false,
  selected = false,
  onClick,
  beamType = 'accent',
  beamAngle,
  className = '',
}) => {
  const isSelected = active || selected;

  // Determine beam preview background
  let beamGradient = 'radial-gradient(ellipse at 50% 0%, rgba(255, 220, 160, 0.45) 0%, transparent 60%)';
  if (beamAngle !== undefined) {
    beamGradient = `linear-gradient(${beamAngle}deg, rgba(255, 230, 180, 0.4) 0%, rgba(198, 181, 139, 0.15) 50%, transparent 80%)`;
  } else if (beamType === 'wall-wash') {
    beamGradient = 'linear-gradient(180deg, rgba(255, 230, 180, 0.4) 0%, rgba(198, 181, 139, 0.1) 45%, transparent 80%)';
  } else if (beamType === 'flood') {
    beamGradient = 'radial-gradient(circle at 50% 20%, rgba(255, 245, 220, 0.5) 0%, rgba(132, 169, 184, 0.2) 50%, transparent 85%)';
  } else if (beamType === 'linear') {
    beamGradient = 'linear-gradient(90deg, transparent 5%, rgba(255, 240, 200, 0.5) 50%, transparent 95%)';
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`lis-preset-card ${isSelected ? 'is-selected' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-pressed={isSelected}
      data-magnetic
    >
      <div className="lis-preset-beam-preview" aria-hidden="true">
        <div
          className="lis-preset-beam-glow"
          style={{
            background: beamGradient,
            opacity: isSelected ? 1 : 0.4,
          }}
        />
      </div>
      <div className="lis-preset-card-title">
        <span>{title}</span>
        {icon && <span className="preset-icon">{icon}</span>}
      </div>
      {subtitle && <div className="lis-preset-card-sub">{subtitle}</div>}
    </div>
  );
};
