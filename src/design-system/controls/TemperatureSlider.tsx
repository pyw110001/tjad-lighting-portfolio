import React from 'react';
import './controls.css';

export interface TemperatureSliderProps {
  value: number; // 2700 - 6500
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

export function kelvinToRgbHex(kelvin: number): string {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
    b = temp <= 19 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  } else {
    r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    b = 255;
  }

  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const TemperatureSlider: React.FC<TemperatureSliderProps> = ({
  value,
  onChange,
  label = 'COLOR TEMPERATURE / 色温',
  min = 2700,
  max = 6500,
  step = 50,
  className = '',
  disabled = false,
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const currentColor = kelvinToRgbHex(value);

  return (
    <div className={`lis-slider-container ${className}`}>
      <div className="lis-slider-header">
        <span className="lis-slider-label">{label}</span>
        <span className="lis-slider-badge" style={{ color: currentColor }}>
          <span
            className="lis-cct-indicator-dot"
            style={{ backgroundColor: currentColor, color: currentColor }}
          />
          {Math.round(value)}K
        </span>
      </div>
      <div className="lis-slider-track-wrap">
        <div className="lis-slider-track lis-cct-slider-track">
          <div
            className="lis-slider-thumb lis-cct-thumb"
            style={{
              left: `${percentage}%`,
              color: currentColor,
              borderColor: currentColor,
            }}
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
          aria-label={label}
          className="lis-slider-input"
          data-cursor="drag"
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
};
