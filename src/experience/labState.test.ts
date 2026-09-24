import { describe, it, expect } from 'vitest';
import {
  kelvinToRGB,
  kelvinToHex,
  calculateSunPosition,
  fullLabReducer,
  initialFullLabState
} from './labState';

describe('Light Lab Physical Algorithms', () => {
  it('correctly approximates Kelvin color temperatures', () => {
    // 2700K Warm Gold
    const [r27, g27, b27] = kelvinToRGB(2700);
    expect(r27).toBe(1);
    expect(g27).toBeGreaterThan(0.5);
    expect(b27).toBeLessThan(0.5);
    expect(kelvinToHex(2700)).toMatch(/^#[0-9a-f]{6}$/i);

    // 4000K Neutral White
    const [r40, g40, b40] = kelvinToRGB(4000);
    expect(r40).toBe(1);
    expect(g40).toBeGreaterThan(0.7);
    expect(b40).toBeGreaterThan(0.5);

    // 6000K Daylight White
    const [r60, g60, b60] = kelvinToRGB(6000);
    expect(r60).toBe(1);
    expect(g60).toBeGreaterThan(0.9);
    expect(b60).toBeGreaterThan(0.85);
  });

  it('computes realistic solar celestial trajectories', () => {
    // 06:00 (Sunrise)
    const sunMorning = calculateSunPosition(6.0);
    expect(sunMorning.elevation).toBeCloseTo(0, 0);
    expect(sunMorning.azimuth).toBeLessThan(0); // East

    // 12:00 (Solar Noon)
    const sunNoon = calculateSunPosition(12.0);
    expect(sunNoon.elevation).toBeCloseTo(65, 0); // Peak elevation
    expect(sunNoon.azimuth).toBeCloseTo(0, 0); // South
    expect(sunNoon.position[1]).toBeGreaterThan(10); // Highest Y

    // 18:00 (Sunset)
    const sunEvening = calculateSunPosition(18.0);
    expect(sunEvening.elevation).toBeCloseTo(0, 0);
    expect(sunEvening.azimuth).toBeGreaterThan(0); // West
  });

  it('processes state actions and clamps values reliably', () => {
    let state = initialFullLabState;

    // Change module
    state = fullLabReducer(state, { type: 'SET_MODULE', value: 'pixel' });
    expect(state.activeModule).toBe('pixel');

    // Field time update with clamping
    state = fullLabReducer(state, { type: 'FIELD_SET_TIME', value: 14.5 });
    expect(state.lightField.time).toBe(14.5);
    state = fullLabReducer(state, { type: 'FIELD_SET_TIME', value: 99 });
    expect(state.lightField.time).toBe(18.0);

    // Pixel speed & brightness update
    state = fullLabReducer(state, { type: 'PIXEL_SET_SPEED', value: 75 });
    expect(state.pixelFacade.speed).toBe(75);
    state = fullLabReducer(state, { type: 'PIXEL_TOGGLE_PAUSE' });
    expect(state.pixelFacade.paused).toBe(true);

    // Color studio preset
    state = fullLabReducer(state, { type: 'COLOR_SET_PRESET', value: 'cool6000' });
    expect(state.colorStudio.preset).toBe('cool6000');

    // DayNight keyframe detection
    state = fullLabReducer(state, { type: 'DAYNIGHT_SET_TIME', value: 12 });
    expect(state.dayNight.keyframe).toBe('day');
    state = fullLabReducer(state, { type: 'DAYNIGHT_SET_TIME', value: 17.5 });
    expect(state.dayNight.keyframe).toBe('sunset');
    state = fullLabReducer(state, { type: 'DAYNIGHT_SET_TIME', value: 20 });
    expect(state.dayNight.keyframe).toBe('night');

    // Fluid Light (Wave) actions
    state = fullLabReducer(state, { type: 'SET_MODULE', value: 'wave' });
    expect(state.activeModule).toBe('wave');
    state = fullLabReducer(state, { type: 'WAVE_SET_PALETTE', value: 'cool6000' });
    expect(state.fluidLight.palette).toBe('cool6000');
    state = fullLabReducer(state, { type: 'WAVE_SET_MODE', value: 'gesture' });
    expect(state.fluidLight.inputMode).toBe('gesture');
    state = fullLabReducer(state, { type: 'WAVE_SET_GRAVITY', value: -5 });
    expect(state.fluidLight.gravity).toBe(-5);
    state = fullLabReducer(state, { type: 'WAVE_TOGGLE_PAUSE' });
    expect(state.fluidLight.paused).toBe(true);
    state = fullLabReducer(state, { type: 'RESET_WAVE' });
    expect(state.fluidLight.palette).toBe('warm3000');
    expect(state.fluidLight.paused).toBe(false);
  });
});
