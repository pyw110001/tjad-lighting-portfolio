import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  const innerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const { pathname } = useLocation();

  // Reset magnetic target on route navigation
  const currentMagneticTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (currentMagneticTargetRef.current) {
      currentMagneticTargetRef.current.style.translate = '';
      currentMagneticTargetRef.current = null;
    }
    if (innerRef.current) {
      innerRef.current.className = 'lis-cursor-inner state-default';
    }
    if (labelRef.current) {
      labelRef.current.textContent = '';
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
      return;
    }

    let mouseX = -100;
    let mouseY = -100;
    let currentX = -100;
    let currentY = -100;
    let hasMoved = false;
    let rafId = 0;
    let currentCursorState: 'default' | 'hover' | 'view' | 'drag' = 'default';
    let currentCursorText = '';

    const loop = () => {
      rafId = 0;
      currentX += (mouseX - currentX) * 0.22;
      currentY += (mouseY - currentY) * 0.22;
      if (Math.abs(mouseX - currentX) < 0.1) currentX = mouseX;
      if (Math.abs(mouseY - currentY) < 0.1) currentY = mouseY;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
      if (currentX !== mouseX || currentY !== mouseY) rafId = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!rafId && !document.hidden) rafId = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const updateState = (state: 'default' | 'hover' | 'view' | 'drag', text: string = '') => {
      if (currentCursorState !== state) {
        currentCursorState = state;
        if (innerRef.current) {
          innerRef.current.className = `lis-cursor-inner state-${state}`;
        }
      }
      if (currentCursorText !== text) {
        currentCursorText = text;
        if (labelRef.current) {
          labelRef.current.textContent = text;
        }
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!hasMoved) {
        currentX = mouseX;
        currentY = mouseY;
        hasMoved = true;
      }
      wake();

      if (cursorRef.current) {
        cursorRef.current.classList.add('is-visible');
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorTarget = target.closest<HTMLElement>('[data-cursor], [data-cursor-text]');
      const magneticCandidate = target.closest<HTMLElement>('[data-magnetic]');
      const magneticTarget = magneticCandidate?.closest('.hero-cta-action, .project-card .project-caption, .contact-teaser')
        ? magneticCandidate
        : null;
      const interactiveTarget = target.closest<HTMLElement>('a, button, input, select, [role="button"], [role="tab"], [role="switch"]');

      // Clear previous magnetic target translate if shifted to a different target
      if (currentMagneticTargetRef.current && currentMagneticTargetRef.current !== magneticTarget) {
        currentMagneticTargetRef.current.style.translate = '';
        currentMagneticTargetRef.current = null;
      }

      // Handle magnetic pull using modern CSS translate (avoids overriding CSS transform: scale)
      if (magneticTarget) {
        currentMagneticTargetRef.current = magneticTarget;
        const rect = magneticTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (mouseX - centerX) * magneticStrength;
        const deltaY = (mouseY - centerY) * magneticStrength;
        magneticTarget.style.translate = `${deltaX}px ${deltaY}px`;
      }

      // Determine cursor state & label
      if (cursorTarget) {
        const cursorType = cursorTarget.getAttribute('data-cursor');
        const customText = cursorTarget.getAttribute('data-cursor-text');

        if (cursorType === 'drag') {
          updateState('drag', '◀ ▶');
        } else if (cursorType === 'view' || cursorType === '探索作品') {
          updateState('view', customText || (cursorType === '探索作品' ? '探索作品' : 'VIEW'));
        } else {
          updateState('view', cursorType || customText || '');
        }
      } else if (interactiveTarget) {
        updateState('hover', '');
      } else {
        updateState('default', '');
      }
    };

    const handlePointerLeave = () => {
      stop();
      hasMoved = false;
      if (cursorRef.current) {
        cursorRef.current.classList.remove('is-visible');
      }
      if (currentMagneticTargetRef.current) {
        currentMagneticTargetRef.current.style.translate = '';
        currentMagneticTargetRef.current = null;
      }
      updateState('default', '');
    };

    const handleMouseDown = () => {
      if (cursorRef.current) {
        cursorRef.current.classList.add('is-pressed');
      }
    };

    const handleMouseUp = () => {
      if (cursorRef.current) {
        cursorRef.current.classList.remove('is-pressed');
      }
    };

    const handleBlur = () => {
      stop();
      hasMoved = false;
      if (cursorRef.current) {
        cursorRef.current.classList.remove('is-pressed');
        cursorRef.current.classList.remove('is-visible');
      }
      if (currentMagneticTargetRef.current) {
        currentMagneticTargetRef.current.style.translate = '';
        currentMagneticTargetRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleBlur();
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (currentMagneticTargetRef.current) {
        currentMagneticTargetRef.current.style.translate = '';
      }
    };
  }, [magneticStrength]);

  return (
    <div
      ref={cursorRef}
      className={`lis-cursor ${className}`}
      aria-hidden="true"
    >
      <div ref={innerRef} className="lis-cursor-inner state-default">
        <span ref={labelRef} className="lis-cursor-label" />
      </div>
    </div>
  );
};
