import { describe, it, expect } from 'vitest';
import { limit, springStep, type Spring } from './motion';

describe('motion physics engine', () => {
  it('correctly clamps values within limits', () => {
    expect(limit(10, 0, 5)).toBe(5);
    expect(limit(-10, 0, 5)).toBe(0);
    expect(limit(3, 0, 5)).toBe(3);
  });

  it('smoothly springs towards target with underdamped convergence', () => {
    const p: Spring = { x: 0, y: 0, vx: 0, vy: 0 };
    // Step once towards target (1, 1)
    springStep(p, 1, 1, 110, 16);
    expect(p.vx).toBeGreaterThan(0);
    expect(p.vy).toBeGreaterThan(0);
    expect(p.x).toBeGreaterThan(0);
    expect(p.y).toBeGreaterThan(0);

    // Run for 120 steps (approx 2 seconds)
    for (let i = 0; i < 120; i++) {
      springStep(p, 1, 1, 110, 16);
    }

    // Should have converged near 1 with negligible velocity
    expect(Math.abs(p.x - 1)).toBeLessThan(0.01);
    expect(Math.abs(p.y - 1)).toBeLessThan(0.01);
    expect(Math.abs(p.vx)).toBeLessThan(0.05);
    expect(Math.abs(p.vy)).toBeLessThan(0.05);
  });

  it('springs back to neutral (0, 0) on pointer release', () => {
    const p: Spring = { x: 1, y: -0.8, vx: 5, vy: -5 };
    // Step towards (0, 0)
    for (let i = 0; i < 120; i++) {
      springStep(p, 0, 0, 110, 16);
    }
    expect(Math.abs(p.x)).toBeLessThan(0.01);
    expect(Math.abs(p.y)).toBeLessThan(0.01);
    expect(Math.abs(p.vx)).toBeLessThan(0.05);
    expect(Math.abs(p.vy)).toBeLessThan(0.05);
  });

  it('respects velocity limits under extreme displacement', () => {
    const p: Spring = { x: -1000, y: 1000, vx: 0, vy: 0 };
    springStep(p, 1000, -1000, 110, 16);
    expect(Math.abs(p.vx)).toBeLessThanOrEqual(1400);
    expect(Math.abs(p.vy)).toBeLessThanOrEqual(1400);
  });
});
