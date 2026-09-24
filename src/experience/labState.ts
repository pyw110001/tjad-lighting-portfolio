/**
 * Light Lab State Machine & Physical Lighting Algorithms
 * Handles color temperature (Kelvin to RGB), celestial solar trajectories,
 * and state management for all 4 lighting experiment modules.
 */

export type LabModuleId = 'field' | 'pixel' | 'day' | 'color' | 'wave';

export type PixelPatternType = 'wave' | 'ripple' | 'flow' | 'pattern' | 'text';

export type LightSourceType = 'sun' | 'artificial' | 'ambient' | 'model';

export type ColorPresetType = 'warm3000' | 'neutral4000' | 'cool6000' | 'rgb';

export type FluidPaletteType = 'warm3000' | 'cool6000' | 'dual' | 'white';

export interface LightFieldState {
  time: number; // 6.0 to 18.0 (e.g., 10.5 = 10:30)
  lightType: LightSourceType;
  intensity: number; // 0 to 100
  tempKelvin: number; // 2500K to 6500K
  angle: [number, number]; // [x, y] in range [-1, 1] for compass direction
  modelType: 'showroom' | 'pavilion' | 'minimal';
}

export interface PixelFacadeState {
  pattern: PixelPatternType;
  speed: number; // 0 to 100
  brightness: number; // 0 to 100
  color: string;
  text: string;
  paused: boolean;
}

export interface DayNightState {
  time: number; // 6.0 to 24.0
  splitRatio: number; // 0.0 (all night) to 1.0 (all day)
  keyframe: 'day' | 'sunset' | 'night';
}

export interface ColorStudioState {
  preset: ColorPresetType;
  intensity: number; // 0 to 100
  customColor: string;
  scene: 'showroom' | 'office' | 'gallery';
}

export interface FluidLightState {
  palette: FluidPaletteType;
  inputMode: 'mouse' | 'gesture';
  gravity: number;
  viscosity: number;
  particleRadius: number;
  paused: boolean;
}

export interface FullLabState {
  activeModule: LabModuleId;
  lightField: LightFieldState;
  pixelFacade: PixelFacadeState;
  dayNight: DayNightState;
  colorStudio: ColorStudioState;
  fluidLight: FluidLightState;
}

export const initialFullLabState: FullLabState = {
  activeModule: 'field',
  lightField: {
    time: 10.5,
    lightType: 'sun',
    intensity: 85,
    tempKelvin: 4000,
    angle: [0.35, 0.45],
    modelType: 'showroom'
  },
  pixelFacade: {
    pattern: 'wave',
    speed: 55,
    brightness: 85,
    color: '#80c3f4',
    text: 'TJAD',
    paused: false
  },
  dayNight: {
    time: 19.5,
    splitRatio: 0.5,
    keyframe: 'night'
  },
  colorStudio: {
    preset: 'warm3000',
    intensity: 80,
    customColor: '#c886ff',
    scene: 'showroom'
  },
  fluidLight: {
    palette: 'warm3000',
    inputMode: 'mouse',
    gravity: -9.8,
    viscosity: 0.85,
    particleRadius: 3.5,
    paused: false
  }
};

/**
 * Planck Blackbody Radiation Kelvin to RGB converter
 * Accurately fits 1000K to 12000K light color characteristics.
 */
export function kelvinToRGB(kelvin: number): [number, number, number] {
  const temp = Math.max(1000, Math.min(12000, kelvin)) / 100;
  let red: number;
  let green: number;
  let blue: number;

  // Red
  if (temp <= 66) {
    red = 255;
  } else {
    red = temp - 60;
    red = 329.698727446 * Math.pow(red, -0.1332047592);
    red = Math.max(0, Math.min(255, red));
  }

  // Green
  if (temp <= 66) {
    green = temp;
    green = 99.4708025861 * Math.log(green) - 161.1195681661;
    green = Math.max(0, Math.min(255, green));
  } else {
    green = temp - 60;
    green = 288.1221695283 * Math.pow(green, -0.0755148492);
    green = Math.max(0, Math.min(255, green));
  }

  // Blue
  if (temp >= 66) {
    blue = 255;
  } else if (temp <= 19) {
    blue = 0;
  } else {
    blue = temp - 10;
    blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
    blue = Math.max(0, Math.min(255, blue));
  }

  return [Math.round(red) / 255, Math.round(green) / 255, Math.round(blue) / 255];
}

export function kelvinToHex(kelvin: number): string {
  const [r, g, b] = kelvinToRGB(kelvin);
  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Celestial Sun Position Calculator
 * Given time in range 6.0 (sunrise) to 18.0 (sunset):
 * Returns 3D directional light position, elevation (degrees), azimuth (degrees), and sunlight color.
 */
export function calculateSunPosition(time: number, customAngle?: [number, number]) {
  const t = Math.max(6.0, Math.min(18.0, time));
  const progress = (t - 6.0) / 12.0; // 0 to 1

  // Natural sun altitude angle: 0 deg at 6:00, peak 65 deg at 12:00, 0 deg at 18:00
  const baseElevation = Math.sin(progress * Math.PI) * 65;
  // Natural sun azimuth angle: east (-65 deg) to south (0 deg) to west (65 deg)
  const baseAzimuth = (progress - 0.5) * 130;

  // If joystick customAngle [x, y] is provided, blend it
  const elevationDeg = customAngle
    ? Math.max(10, Math.min(85, baseElevation + (customAngle[1] - 0.5) * 30))
    : baseElevation;
  const azimuthDeg = customAngle
    ? baseAzimuth + (customAngle[0] - 0.5) * 60
    : baseAzimuth;

  const elevRad = (elevationDeg * Math.PI) / 180;
  const azimRad = (azimuthDeg * Math.PI) / 180;

  // Spherical to Cartesian coordinates
  const radius = 22;
  const x = Math.sin(azimRad) * Math.cos(elevRad) * radius;
  const y = Math.max(1.8, Math.sin(elevRad) * radius);
  const z = Math.cos(azimRad) * Math.cos(elevRad) * radius;

  // Temperature transitions: 3000K warm gold at sunrise/sunset -> 5500K neutral daylight at noon
  const kelvin = Math.round(3000 + Math.sin(progress * Math.PI) * 2500);

  return {
    position: [x, y, z] as [number, number, number],
    elevation: elevationDeg,
    azimuth: azimuthDeg,
    colorHex: kelvinToHex(kelvin),
    progress
  };
}

export type LabAction =
  | { type: 'SET_MODULE'; value: LabModuleId }
  | { type: 'RESET_ALL' }
  | { type: 'RESET_FIELD' }
  | { type: 'RESET_PIXEL' }
  | { type: 'FIELD_SET_TIME'; value: number }
  | { type: 'FIELD_SET_LIGHT_TYPE'; value: LightSourceType }
  | { type: 'FIELD_SET_INTENSITY'; value: number }
  | { type: 'FIELD_SET_KELVIN'; value: number }
  | { type: 'FIELD_SET_ANGLE'; value: [number, number] }
  | { type: 'FIELD_SET_MODEL'; value: 'showroom' | 'pavilion' | 'minimal' }
  | { type: 'PIXEL_SET_PATTERN'; value: PixelPatternType }
  | { type: 'PIXEL_SET_SPEED'; value: number }
  | { type: 'PIXEL_SET_BRIGHTNESS'; value: number }
  | { type: 'PIXEL_SET_COLOR'; value: string }
  | { type: 'PIXEL_SET_TEXT'; value: string }
  | { type: 'PIXEL_TOGGLE_PAUSE' }
  | { type: 'DAYNIGHT_SET_TIME'; value: number }
  | { type: 'DAYNIGHT_SET_SPLIT'; value: number }
  | { type: 'COLOR_SET_PRESET'; value: ColorPresetType }
  | { type: 'COLOR_SET_INTENSITY'; value: number }
  | { type: 'COLOR_SET_CUSTOM'; value: string }
  | { type: 'RESET_WAVE' }
  | { type: 'WAVE_SET_PALETTE'; value: FluidPaletteType }
  | { type: 'WAVE_SET_MODE'; value: 'mouse' | 'gesture' }
  | { type: 'WAVE_SET_GRAVITY'; value: number }
  | { type: 'WAVE_SET_VISCOSITY'; value: number }
  | { type: 'WAVE_SET_RADIUS'; value: number }
  | { type: 'WAVE_TOGGLE_PAUSE' };

export function fullLabReducer(state: FullLabState, action: LabAction): FullLabState {
  switch (action.type) {
    case 'SET_MODULE':
      return { ...state, activeModule: action.value };
    case 'RESET_ALL':
      return { ...initialFullLabState };
    case 'RESET_FIELD':
      return { ...state, lightField: { ...initialFullLabState.lightField } };
    case 'RESET_PIXEL':
      return { ...state, pixelFacade: { ...initialFullLabState.pixelFacade } };
    case 'FIELD_SET_TIME':
      return {
        ...state,
        lightField: { ...state.lightField, time: Math.max(6.0, Math.min(18.0, action.value)) }
      };
    case 'FIELD_SET_LIGHT_TYPE':
      return { ...state, lightField: { ...state.lightField, lightType: action.value } };
    case 'FIELD_SET_INTENSITY':
      return {
        ...state,
        lightField: { ...state.lightField, intensity: Math.max(0, Math.min(100, action.value)) }
      };
    case 'FIELD_SET_KELVIN':
      return {
        ...state,
        lightField: { ...state.lightField, tempKelvin: Math.max(2500, Math.min(6500, action.value)) }
      };
    case 'FIELD_SET_ANGLE':
      return { ...state, lightField: { ...state.lightField, angle: action.value } };
    case 'FIELD_SET_MODEL':
      return { ...state, lightField: { ...state.lightField, modelType: action.value } };
    case 'PIXEL_SET_PATTERN':
      return { ...state, pixelFacade: { ...state.pixelFacade, pattern: action.value } };
    case 'PIXEL_SET_SPEED':
      return {
        ...state,
        pixelFacade: { ...state.pixelFacade, speed: Math.max(0, Math.min(100, action.value)) }
      };
    case 'PIXEL_SET_BRIGHTNESS':
      return {
        ...state,
        pixelFacade: { ...state.pixelFacade, brightness: Math.max(0, Math.min(100, action.value)) }
      };
    case 'PIXEL_SET_COLOR':
      return { ...state, pixelFacade: { ...state.pixelFacade, color: action.value } };
    case 'PIXEL_SET_TEXT':
      return { ...state, pixelFacade: { ...state.pixelFacade, text: action.value } };
    case 'PIXEL_TOGGLE_PAUSE':
      return {
        ...state,
        pixelFacade: { ...state.pixelFacade, paused: !state.pixelFacade.paused }
      };
    case 'DAYNIGHT_SET_TIME': {
      const time = Math.max(6.0, Math.min(24.0, action.value));
      const keyframe = time < 16.5 ? 'day' : time < 19.0 ? 'sunset' : 'night';
      return {
        ...state,
        dayNight: { ...state.dayNight, time, keyframe }
      };
    }
    case 'DAYNIGHT_SET_SPLIT':
      return {
        ...state,
        dayNight: { ...state.dayNight, splitRatio: Math.max(0, Math.min(1, action.value)) }
      };
    case 'COLOR_SET_PRESET':
      return {
        ...state,
        colorStudio: { ...state.colorStudio, preset: action.value }
      };
    case 'COLOR_SET_INTENSITY':
      return {
        ...state,
        colorStudio: {
          ...state.colorStudio,
          intensity: Math.max(0, Math.min(100, action.value))
        }
      };
    case 'COLOR_SET_CUSTOM':
      return {
        ...state,
        colorStudio: { ...state.colorStudio, customColor: action.value }
      };
    case 'RESET_WAVE':
      return {
        ...state,
        fluidLight: { ...initialFullLabState.fluidLight }
      };
    case 'WAVE_SET_PALETTE':
      return {
        ...state,
        fluidLight: { ...state.fluidLight, palette: action.value }
      };
    case 'WAVE_SET_MODE':
      return {
        ...state,
        fluidLight: { ...state.fluidLight, inputMode: action.value }
      };
    case 'WAVE_SET_GRAVITY':
      return {
        ...state,
        fluidLight: { ...state.fluidLight, gravity: action.value }
      };
    case 'WAVE_SET_VISCOSITY':
      return {
        ...state,
        fluidLight: { ...state.fluidLight, viscosity: action.value }
      };
    case 'WAVE_SET_RADIUS':
      return {
        ...state,
        fluidLight: { ...state.fluidLight, particleRadius: action.value }
      };
    case 'WAVE_TOGGLE_PAUSE':
      return {
        ...state,
        fluidLight: { ...state.fluidLight, paused: !state.fluidLight.paused }
      };
    default:
      return state;
  }
}
