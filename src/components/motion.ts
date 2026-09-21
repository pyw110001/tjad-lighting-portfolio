import { useEffect, useRef } from 'react';

export type Spring = { x: number; y: number; vx: number; vy: number };

export const limit = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));

/**
 * One fixed 1/60s step. Position follows a target with an underdamped spring.
 * Default: stiffness k=110, damping c=16, velocity limit ±1400.
 */
export function springStep(
  p: Spring,
  targetX: number,
  targetY: number,
  stiffness = 110,
  damping = 16
): void {
  p.vx = limit(p.vx + ((targetX - p.x) * stiffness - p.vx * damping) / 60, -1400, 1400);
  p.vy = limit(p.vy + ((targetY - p.y) * stiffness - p.vy * damping) / 60, -1400, 1400);
  p.x += p.vx / 60;
  p.y += p.vy / 60;
}

/**
 * High-performance fixed-step RAF loop per element.
 * Automatically pauses when offscreen (IntersectionObserver), in background tab, or settled.
 */
export function useMotionLoop(
  tick: () => void,
  paused = false,
  reduced = false
) {
  const host = useRef<HTMLDivElement>(null);
  const tickRef = useRef(tick);
  const flags = useRef({ paused, reduced });
  const budget = useRef(0);

  tickRef.current = tick;
  flags.current = { paused, reduced };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frame = 0;
    let previous = 0;
    let accumulator = 0;
    let visible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        previous = 0;
      },
      { threshold: 0.05 }
    );

    if (host.current) {
      observer.observe(host.current);
    }

    const run = (time: number) => {
      frame = requestAnimationFrame(run);

      if (
        document.hidden ||
        !visible ||
        flags.current.paused ||
        (flags.current.reduced && budget.current <= 0)
      ) {
        previous = 0;
        accumulator = 0;
        return;
      }

      accumulator += previous ? Math.min(50, time - previous) : 16.667;
      previous = time;

      let count = 0;
      while (accumulator >= 16.666 && count < 3) {
        tickRef.current();
        accumulator -= 16.666;
        count++;
        budget.current = Math.max(0, budget.current - 1);
      }
    };

    frame = requestAnimationFrame(run);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return {
    host,
    wake: (frames = 120) => {
      budget.current = frames;
    }
  };
}
