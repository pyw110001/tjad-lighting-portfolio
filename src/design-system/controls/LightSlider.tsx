import React from 'react';
import './controls.css';

export interface LightSliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const LightSlider: React.FC<LightSliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  unit,
  onChange,
  formatValue,
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const displayValue = formatValue
    ? formatValue(value)
    : unit
    ? `${value}${unit}`
    : String(value);

  return (
    <div className={`lis-slider-container ${className}`}>
      {(label || unit || formatValue) ? (
        <div className="lis-slider-header">
          {label && <span className="lis-slider-label">{label}</span>}
          <span className="lis-slider-badge">{displayValue}</span>
        </div>
      ) : null}
      <div className="lis-slider-track-wrap">
        <div className="lis-slider-track">
          <div
            className="lis-slider-fill"
            style={{ width: `${percentage}%` }}
            aria-hidden="true"
          />
          <div
            className="lis-slider-thumb"
            style={{ left: `${percentage}%` }}
            aria-hidden="true"
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel || label}
          className="lis-slider-input"
          data-cursor="drag"
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};
