import React, { useEffect, useRef, useState } from 'react';
import './cursor.css';

export interface UnifiedMagneticCursorProps {
  magneticStrength?: number;
  className?: string;
}

export const UnifiedMagneticCursor: React.FC<UnifiedMagneticCursorProps> = ({
  magneticStrength = 0.12,
  className = '',
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorLabel, setCursorLabel] = useState<string>('');
  const [cursorState, setCursorState] = useState<'default' | 'hover' | 'view' | 'drag'>('default');
  const [isPressed, setIsPressed] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
      return;
    }

    let mouseX = -100;
    let mouseY = -100;
    let currentX = -100;
    let currentY = -100;
    let rafId = 0;
    let currentMagneticTarget: HTMLElement | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setIsVisible(true);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorTarget = target.closest<HTMLElement>('[data-cursor], [data-cursor-text]');
      const magneticTarget = target.closest<HTMLElement>('[data-magnetic]');
      const interactiveTarget = target.closest<HTMLElement>('a, button, input, [role="button"], [role="tab"]');

      // Clear previous magnetic target translate if shifted
      if (currentMagneticTarget && currentMagneticTarget !== magneticTarget) {
        currentMagneticTarget.style.transform = '';
        currentMagneticTarget = null;
      }

      // Handle magnetic pull
      if (magneticTarget) {
        currentMagneticTarget = magneticTarget;
        const rect = magneticTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (mouseX - centerX) * magneticStrength;
        const deltaY = (mouseY - centerY) * magneticStrength;
        magneticTarget.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
      }

      // Determine state and label
      if (cursorTarget) {
        const cursorType = cursorTarget.getAttribute('data-cursor');
        const customText = cursorTarget.getAttribute('data-cursor-text');

        if (cursorType === 'drag') {
          setCursorState('drag');
          setCursorLabel('◀ ▶');
        } else if (cursorType === 'view' || cursorType === '探索作品') {
          setCursorState('view');
          setCursorLabel(customText || (cursorType === '探索作品' ? '探索作品' : 'VIEW'));
        } else {
          setCursorState('view');
          setCursorLabel(cursorType || customText || '');
        }
      } else if (interactiveTarget) {
        setCursorState('hover');
        setCursorLabel('');
      } else {
        setCursorState('default');
        setCursorLabel('');
      }
    };

    const handlePointerLeave = () => {
      setIsVisible(false);
      if (currentMagneticTarget) {
        currentMagneticTarget.style.transform = '';
        currentMagneticTarget = null;
      }
    };

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);

    const loop = () => {
      // Smooth lerp
      currentX += (mouseX - currentX) * 0.22;
      currentY += (mouseY - currentY) * 0.22;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }

      rafId = requestAnimationFrame(loop);
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (currentMagneticTarget) {
        currentMagneticTarget.style.transform = '';
      }
    };
  }, [magneticStrength]);

  return (
    <div
      ref={cursorRef}
      className={`lis-cursor state-${cursorState} ${isVisible ? 'is-visible' : ''} ${
        isPressed ? 'is-pressed' : ''
      } ${className}`}
      aria-hidden="true"
    >
      {cursorLabel && <span className="lis-cursor-label">{cursorLabel}</span>}
    </div>
  );
};
