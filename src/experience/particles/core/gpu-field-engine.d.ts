import type { EngineOptions, FieldEngine } from '../types';
export const DEFAULT_INTERACTION_SPEED: number;
export const GPUFieldEngine: new (canvas: HTMLCanvasElement, options: EngineOptions) => FieldEngine & { init(): Promise<void> };
