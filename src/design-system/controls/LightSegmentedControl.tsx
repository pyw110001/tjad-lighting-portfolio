import React, { useRef, useEffect, useState } from 'react';
import './controls.css';

export interface SegmentedOption<T extends string = string> {
  id?: T;
  value?: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface LightSegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

export function LightSegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  'aria-label': ariaLabel,
}: LightSegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 4,
    width: 0,
  });

  const getOptionKey = (opt: SegmentedOption<T>) => (opt.id || opt.value) as T;

  useEffect(() => {
    if (!containerRef.current) return;
    const activeIndex = options.findIndex((o) => getOptionKey(o) === value);
    if (activeIndex === -1) return;

    const items = containerRef.current.querySelectorAll<HTMLButtonElement>('.lis-segmented-item');
    const activeEl = items[activeIndex];
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      className={`lis-segmented-control ${className}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <div
        className="lis-segmented-indicator"
        style={{
          transform: `translateX(${indicatorStyle.left - 4}px)`,
          width: `${indicatorStyle.width}px`,
        }}
        aria-hidden="true"
      />
      {options.map((opt) => {
        const optVal = getOptionKey(opt);
        const isSelected = optVal === value;
        return (
          <button
            key={optVal}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={opt.disabled}
            className={`lis-segmented-item ${isSelected ? 'is-selected' : ''} ${
              opt.disabled ? 'is-disabled' : ''
            }`}
            onClick={() => {
              if (!opt.disabled) onChange(optVal);
            }}
          >
            {opt.icon && <span className="item-icon">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
