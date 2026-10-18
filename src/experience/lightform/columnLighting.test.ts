import { expect, it } from 'vitest';
import { columnCycle, COLUMN_CYCLE_SECONDS, createColumnLighting } from './columnLighting';

it('reveals the columns upward slowly and breathes to darkness before repeating', () => {
  expect(columnCycle(0)).toEqual({ fill: 0, breath: 0 });
  expect(columnCycle(1).fill).toBeLessThan(columnCycle(3).fill);
  expect(columnCycle(3).fill).toBeLessThan(columnCycle(5.4).fill);
  expect(columnCycle(5.4).fill).toBe(1);
  expect(columnCycle(4.5).breath).toBeCloseTo(1);
  expect(columnCycle(8).breath).toBeLessThan(columnCycle(6).breath);
  expect(columnCycle(COLUMN_CYCLE_SECONDS)).toEqual({ fill: 0, breath: 0 });
});

it('owns one lighting clock and warm-white signal for all column heights', () => {
  const light = createColumnLighting(), short = light.material(3), tall = light.material(8);
  light.update(100); light.update(104.5);
  expect(short.uniforms.uBreath).toBe(tall.uniforms.uBreath);
  expect(short.uniforms.uBreath.value).toBeCloseTo(1);
  expect(short.uniforms.uWarm.value.r).toBeGreaterThan(short.uniforms.uWarm.value.g);
  expect(short.uniforms.uWarm.value.g).toBeGreaterThan(short.uniforms.uWarm.value.b);
  expect(short.uniforms.uHeight.value).toBe(3); expect(tall.uniforms.uHeight.value).toBe(8);
  expect(short.uniforms.uMedia).toBeUndefined();
  short.dispose(); tall.dispose();
});
