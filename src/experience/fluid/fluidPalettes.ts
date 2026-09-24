/**
 * Architectural Lighting Color Palettes for WebGPU Fluid Light Simulation
 * Generates 256-step Float32Array RGBA Look-Up Tables (LUTs) based on velocity magnitude.
 */

export type FluidPaletteType = 'warm3000' | 'cool6000' | 'dual' | 'white';

interface ColorStop {
  t: number;
  color: [number, number, number];
}

const PALETTES: Record<FluidPaletteType, ColorStop[]> = {
  // Champagne Gold 3000K - Architectural Warm Light
  warm3000: [
    { t: 0.0, color: [0.65, 0.52, 0.28] }, // Radiant warm gold at rest
    { t: 0.25, color: [0.78, 0.65, 0.35] }, // TJAD Gold #C6B58B
    { t: 0.50, color: [0.92, 0.78, 0.45] },
    { t: 0.75, color: [1.0, 0.88, 0.62] },
    { t: 1.0, color: [1.0, 0.98, 0.92] } // Incandescent luminous core
  ],

  // Cyan Aurora 6000K - Cool Daylight
  cool6000: [
    { t: 0.0, color: [0.28, 0.52, 0.70] }, // Glacial cyan at rest
    { t: 0.25, color: [0.42, 0.66, 0.78] }, // TJAD Cool #84A9B8
    { t: 0.50, color: [0.60, 0.82, 0.92] },
    { t: 0.75, color: [0.82, 0.94, 1.0] },
    { t: 1.0, color: [1.0, 1.0, 1.0] }
  ],

  // Dual CCT - Cold & Warm Dual Temperature Harmony
  dual: [
    { t: 0.0, color: [0.30, 0.60, 0.65] }, // Cyan aurora
    { t: 0.35, color: [0.55, 0.75, 0.70] },
    { t: 0.65, color: [0.85, 0.72, 0.38] }, // Warm champagne gold
    { t: 1.0, color: [1.0, 0.96, 0.88] }
  ],

  // Pure Daylight - Minimalist Architectural White Light
  white: [
    { t: 0.0, color: [0.62, 0.64, 0.68] }, // Pearl mist at rest
    { t: 0.40, color: [0.78, 0.80, 0.84] },
    { t: 0.75, color: [0.92, 0.94, 0.96] },
    { t: 1.0, color: [1.0, 1.0, 1.0] }
  ]
};

/**
 * Generates a 256x4 Float32Array containing linear RGBA color values for the given palette.
 */
export function generateFluidPaletteLUT(paletteType: FluidPaletteType = 'warm3000'): Float32Array {
  const stops = PALETTES[paletteType] || PALETTES.warm3000;
  const data = new Float32Array(256 * 4);

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let s0 = stops[0];
    let s1 = stops[stops.length - 1];

    for (let j = 0; j < stops.length - 1; j++) {
      if (t >= stops[j].t && t <= stops[j + 1].t) {
        s0 = stops[j];
        s1 = stops[j + 1];
        break;
      }
    }

    const range = s1.t - s0.t;
    const factor = range > 0 ? (t - s0.t) / range : 0;

    data[i * 4 + 0] = s0.color[0] + (s1.color[0] - s0.color[0]) * factor;
    data[i * 4 + 1] = s0.color[1] + (s1.color[1] - s0.color[1]) * factor;
    data[i * 4 + 2] = s0.color[2] + (s1.color[2] - s0.color[2]) * factor;
    data[i * 4 + 3] = 1.0;
  }

  return data;
}

export const FLUID_PALETTE_INFO: { id: FluidPaletteType; nameZh: string; nameEn: string; primaryColor: string }[] = [
  { id: 'warm3000', nameZh: '暖金 3000K', nameEn: 'Champagne Gold', primaryColor: '#C6B58B' },
  { id: 'cool6000', nameZh: '极光 6000K', nameEn: 'Cyan Aurora', primaryColor: '#84A9B8' },
  { id: 'dual', nameZh: '双色温', nameEn: 'Dual CCT', primaryColor: '#A7C8A0' },
  { id: 'white', nameZh: '纯白日光', nameEn: 'Daylight White', primaryColor: '#ECEAE4' }
];
