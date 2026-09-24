import { generateFluidPaletteLUT, type FluidPaletteType } from './fluidPalettes';

export interface FluidEngineConfig {
  gravity: number;
  timeScale: number;
  substeps: number;
  targetDensity: number;
  pressureMultiplier: number;
  nearPressureMultiplier: number;
  viscosityStrength: number;
  surfaceTension: number;
  smoothingRadius: number;
  collisionDamping: number;
  interactionRadius: number;
  interactionStrength: number;
  particleRadius: number;
  velocityDisplayMax: number;
  spawnDensity: number;
  jitterStr: number;
  palette: FluidPaletteType;
}

export const DEFAULT_FLUID_CONFIG: FluidEngineConfig = {
  gravity: -9.8,
  timeScale: 1.4,
  substeps: 3,
  targetDensity: 13,
  pressureMultiplier: 120,
  nearPressureMultiplier: 9,
  viscosityStrength: 0.85,
  surfaceTension: 0.50,
  smoothingRadius: 0.70,
  collisionDamping: 0.95,
  interactionRadius: 4.0,
  interactionStrength: 350.0,
  particleRadius: 3.5,
  velocityDisplayMax: 10.0,
  spawnDensity: 0.38,
  jitterStr: 0.02,
  palette: 'warm3000'
};

const MAX_PARTICLES = 30000;
const WORKGROUP_SIZE = 256;
const GRID_SIZE = 128;
const TABLE_SIZE = GRID_SIZE * GRID_SIZE;

interface KernelConstants {
  poly6: number;
  spikyGrad: number;
  nearKernel: number;
  viscLap: number;
  cohesion: number;
  h: number;
  h2: number;
}

function computeKernelConstants(h: number): KernelConstants {
  const h2 = h * h;
  const h3 = h2 * h;
  const h4 = h3 * h;
  const h5 = h4 * h;
  const h6 = h5 * h;
  const h8 = h6 * h2;
  const h9 = h8 * h;
  const pi = Math.PI;

  const poly6 = 4.0 / (pi * h8);
  const spikyGrad = -10.0 / (pi * h5);
  const nearKernel = 10.0 / (pi * h5);
  const viscLap = 40.0 / (pi * h5);
  const cohesion = 32.0 / (pi * h9);

  return { poly6, spikyGrad, nearKernel, viscLap, cohesion, h, h2 };
}

export class WebGPUFluidEngine {
  public config: FluidEngineConfig;
  public particleCount = 0;
  public isRunning = false;
  public isPaused = false;
  public fps = 0;

  private canvas: HTMLCanvasElement | null = null;
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private ctx: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  // Buffers
  private positionsBuffer: GPUBuffer | null = null;
  private predictedBuffer: GPUBuffer | null = null;
  private velocitiesBuffer: GPUBuffer | null = null;
  private densitiesBuffer: GPUBuffer | null = null;
  private keysBuffer: GPUBuffer | null = null;
  private indicesBuffer: GPUBuffer | null = null;
  private cellCountBuffer: GPUBuffer | null = null;
  private cellOffsetBuffer: GPUBuffer | null = null;
  private sortedKeysBuffer: GPUBuffer | null = null;
  private sortedIndicesBuffer: GPUBuffer | null = null;
  private prefixSumABuffer: GPUBuffer | null = null;
  private uniformsBuffer: GPUBuffer | null = null;
  private renderUniformBuffer: GPUBuffer | null = null;
  private gradientBuffer: GPUBuffer | null = null;

  // Pipelines
  private extForcesPipeline: GPUComputePipeline | null = null;
  private clearCellsPipeline: GPUComputePipeline | null = null;
  private hashPipeline: GPUComputePipeline | null = null;
  private prefixSumPipeline: GPUComputePipeline | null = null;
  private scatterPipeline: GPUComputePipeline | null = null;
  private buildOffsetsPipeline: GPUComputePipeline | null = null;
  private buildOffsets2Pipeline: GPUComputePipeline | null = null;
  private densityPipeline: GPUComputePipeline | null = null;
  private pressurePipeline: GPUComputePipeline | null = null;
  private viscosityPipeline: GPUComputePipeline | null = null;
  private integratePipeline: GPUComputePipeline | null = null;
  private particleRenderPipeline: GPURenderPipeline | null = null;

  // Bind groups
  private bgExtForces: GPUBindGroup | null = null;
  private bgClearCells: GPUBindGroup | null = null;
  private bgHash: GPUBindGroup | null = null;
  private bgPrefixSum: GPUBindGroup | null = null;
  private bgScatter: GPUBindGroup | null = null;
  private bgBuildOffsets: GPUBindGroup | null = null;
  private bgBuildOffsets2: GPUBindGroup | null = null;
  private bgDensity: GPUBindGroup | null = null;
  private bgPressure: GPUBindGroup | null = null;
  private bgViscosity: GPUBindGroup | null = null;
  private bgIntegrate: GPUBindGroup | null = null;
  private bgRender: GPUBindGroup | null = null;

  // Line Pipeline for Boundary Frame
  private linePipeline: GPURenderPipeline | null = null;
  private lineBindGroup: GPUBindGroup | null = null;
  private lineVertexBuffer: GPUBuffer | null = null;

  // Memory stages
  private uniformStaging = new ArrayBuffer(256);
  private uniformF32 = new Float32Array(this.uniformStaging);
  private uniformU32 = new Uint32Array(this.uniformStaging);
  private renderUniformStaging = new Float32Array(20);

  // Bounds & Interaction State (worldH = 30 for calibrated SPH simulation)
  private bounds = { minX: -20, maxX: 20, minY: -15, maxY: 15 };
  private mouseState = { worldX: 0, worldY: 0, active: 0, strength: 0 };
  private rafId = 0;
  private lastTime = 0;
  private frameCount = 0;
  private lastFpsTime = 0;

  constructor(initialConfig: Partial<FluidEngineConfig> = {}) {
    this.config = { ...DEFAULT_FLUID_CONFIG, ...initialConfig };
  }

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;
  }

  public async init(canvas: HTMLCanvasElement): Promise<void> {
    if (!WebGPUFluidEngine.isSupported()) {
      throw new Error('WebGPU is not supported on this browser or platform');
    }

    this.canvas = canvas;
    this.adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!this.adapter) {
      throw new Error('Failed to acquire WebGPU adapter');
    }

    this.device = await this.adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize: this.adapter.limits.maxStorageBufferBindingSize,
        maxComputeWorkgroupsPerDimension: this.adapter.limits.maxComputeWorkgroupsPerDimension
      }
    });

    this.device.addEventListener('uncapturederror', (event: any) => {
      console.warn('[WebGPU Uncaptured Error]:', event.error?.message || event.error);
    });

    this.device.lost.then(info => {
      console.warn('WebGPU device was lost:', info.message);
      this.stop();
    });

    this.ctx = canvas.getContext('webgpu') as GPUCanvasContext;
    if (!this.ctx) {
      throw new Error('Failed to get webgpu canvas context');
    }

    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.ctx.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'opaque'
    });

    this.updateBounds();
    this.initBuffers();
    this.initPipelines();
    this.createBindGroups();
    this.uploadGradientLUT(this.config.palette);
    this.resetSimulation();
    console.warn('[Fluid Init Done]', {
      particleCount: this.particleCount,
      canvasW: this.canvas.width,
      canvasH: this.canvas.height,
      bounds: this.bounds
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastFpsTime = performance.now();
    this.frameCount = 0;

    const loop = (now: number) => {
      if (!this.isRunning) return;
      this.rafId = requestAnimationFrame(loop);
      this.renderFrame(now);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public setPalette(palette: FluidPaletteType): void {
    this.config.palette = palette;
    this.uploadGradientLUT(palette);
  }

  public updateConfig(partial: Partial<FluidEngineConfig>): void {
    this.config = { ...this.config, ...partial };
    if (partial.palette) {
      this.uploadGradientLUT(partial.palette);
    }
  }

  public setPointer(worldX: number, worldY: number, active: boolean, strengthSign = 1): void {
    this.mouseState.worldX = worldX;
    this.mouseState.worldY = worldY;
    if (active) {
      this.mouseState.active = 1;
      this.mouseState.strength = strengthSign * this.config.interactionStrength;
    } else {
      this.mouseState.active = 0;
      this.mouseState.strength = 0;
    }
  }

  public screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    return {
      x: this.bounds.minX + nx * (this.bounds.maxX - this.bounds.minX),
      y: this.bounds.minY + ny * (this.bounds.maxY - this.bounds.minY)
    };
  }

  public resize(width: number, height: number): void {
    if (!this.canvas || !this.ctx || !this.device) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const renderWidth = Math.max(1, Math.floor(width * dpr));
    const renderHeight = Math.max(1, Math.floor(height * dpr));

    const needsResize = this.canvas.width !== renderWidth || this.canvas.height !== renderHeight;
    if (needsResize) {
      this.canvas.width = renderWidth;
      this.canvas.height = renderHeight;
      this.ctx.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'opaque'
      });
      this.updateBounds();
      if (this.particleCount < 1000) {
        this.resetSimulation();
      }
    }
  }

  public resetSimulation(): void {
    if (!this.device || !this.positionsBuffer || !this.velocitiesBuffer) return;

    const boundsW = this.bounds.maxX - this.bounds.minX;
    const boundsH = this.bounds.maxY - this.bounds.minY;
    const spawnW = boundsW * 0.85;
    const spawnH = boundsH * 0.40;
    const startX = -spawnW / 2;
    const startY = -boundsH / 2 + 0.5;

    const positions: number[] = [];
    const velocities: number[] = [];
    const spacing = this.config.spawnDensity;
    const jitter = this.config.jitterStr;

    for (let y = startY; y < startY + spawnH; y += spacing) {
      for (let x = startX; x < startX + spawnW; x += spacing) {
        if (positions.length / 2 >= MAX_PARTICLES) break;
        const jx = x + (Math.random() - 0.5) * jitter;
        const jy = y + (Math.random() - 0.5) * jitter;
        positions.push(jx, jy);
        velocities.push(0, 0);
      }
    }

    this.particleCount = positions.length / 2;
    this.device.queue.writeBuffer(this.positionsBuffer, 0, new Float32Array(positions));
    this.device.queue.writeBuffer(this.velocitiesBuffer, 0, new Float32Array(velocities));
  }

  public destroy(): void {
    this.stop();
    const bufs = [
      this.positionsBuffer, this.predictedBuffer, this.velocitiesBuffer, this.densitiesBuffer,
      this.keysBuffer, this.indicesBuffer, this.cellCountBuffer, this.cellOffsetBuffer,
      this.sortedKeysBuffer, this.sortedIndicesBuffer, this.prefixSumABuffer,
      this.uniformsBuffer, this.renderUniformBuffer, this.gradientBuffer
    ];
    bufs.forEach(b => b?.destroy());
    this.lineVertexBuffer?.destroy();
    this.device = null;
    this.ctx = null;
  }

  // ─── Private Internal Pipeline & Shaders ───

  private updateBounds(): void {
    if (!this.canvas) return;
    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    const halfH = 15.0; // worldH = 30, matching calibrated SPH domain
    const halfW = halfH * aspect;
    this.bounds = {
      minX: -halfW,
      maxX: halfW,
      minY: -halfH,
      maxY: halfH
    };
  }

  private initBuffers(): void {
    if (!this.device) return;
    const pc = MAX_PARTICLES;
    const f2 = pc * 2 * 4;
    const u1 = pc * 4;

    const SCV = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX;
    const SC = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    const S = GPUBufferUsage.STORAGE;

    this.lineVertexBuffer = this.device.createBuffer({
      size: 32 * 8,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      label: 'lineVerts'
    });

    this.positionsBuffer = this.device.createBuffer({ size: f2, usage: SCV, label: 'positions' });
    this.predictedBuffer = this.device.createBuffer({ size: f2, usage: S, label: 'predicted' });
    this.velocitiesBuffer = this.device.createBuffer({ size: f2, usage: SC, label: 'velocities' });
    this.densitiesBuffer = this.device.createBuffer({ size: f2, usage: S, label: 'densities' });

    this.keysBuffer = this.device.createBuffer({ size: u1, usage: S, label: 'keys' });
    this.indicesBuffer = this.device.createBuffer({ size: u1, usage: S, label: 'indices' });
    this.cellCountBuffer = this.device.createBuffer({ size: TABLE_SIZE * 4, usage: SC, label: 'cellCount' });
    this.cellOffsetBuffer = this.device.createBuffer({ size: TABLE_SIZE * 4, usage: S, label: 'cellOffset' });
    this.sortedKeysBuffer = this.device.createBuffer({ size: u1, usage: S, label: 'sortedKeys' });
    this.sortedIndicesBuffer = this.device.createBuffer({ size: u1, usage: S, label: 'sortedIndices' });
    this.prefixSumABuffer = this.device.createBuffer({ size: TABLE_SIZE * 4, usage: S, label: 'prefixSumA' });

    this.uniformsBuffer = this.device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'simUniforms'
    });

    this.renderUniformBuffer = this.device.createBuffer({
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: 'renderUniforms'
    });

    this.gradientBuffer = this.device.createBuffer({
      size: 256 * 4 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: 'gradientBuffer'
    });
  }

  private uploadGradientLUT(palette: FluidPaletteType): void {
    if (!this.device || !this.gradientBuffer) return;
    const data = generateFluidPaletteLUT(palette);
    this.device.queue.writeBuffer(this.gradientBuffer, 0, data);
  }

  private initPipelines(): void {
    if (!this.device) return;

    const uniformsStruct = `
      struct Uniforms {
        gravity: vec2<f32>,
        dt: f32,
        particleCount: u32,
        smoothingRadius: f32,
        targetDensity: f32,
        pressureMultiplier: f32,
        nearPressureMultiplier: f32,
        viscosityStrength: f32,
        collisionDamping: f32,
        boundsMinX: f32,
        boundsMinY: f32,
        boundsMaxX: f32,
        boundsMaxY: f32,
        poly6: f32,
        spikyGrad: f32,
        spikyGrad2: f32,
        viscLap: f32,
        h: f32,
        h2: f32,
        mouseX: f32,
        mouseY: f32,
        mouseActive: f32,
        mouseStrength: f32,
        mouseRadius: f32,
        gridSize: u32,
        tableSize: u32,
        obstacleMinX: f32,
        obstacleMinY: f32,
        obstacleMaxX: f32,
        obstacleMaxY: f32,
        surfaceTension: f32,
        cohesionKernel: f32,
      };
      @group(0) @binding(0) var<uniform> u: Uniforms;
    `;

    const hashFunctions = `
      fn hashCell(cx: i32, cy: i32) -> u32 {
        let gs = i32(u.gridSize);
        let cxc = clamp(cx, 0, gs - 1);
        let cyc = clamp(cy, 0, gs - 1);
        return u32(cyc * gs + cxc);
      }
      fn cellCoord(pos: vec2<f32>) -> vec2<i32> {
        let inv = 1.0 / u.h;
        return vec2<i32>(
          i32(floor((pos.x - u.boundsMinX) * inv)),
          i32(floor((pos.y - u.boundsMinY) * inv))
        );
      }
    `;

    const createComputePipeline = (code: string, label: string) => {
      const module = this.device!.createShaderModule({ code, label });
      return this.device!.createComputePipeline({
        layout: 'auto',
        compute: { module, entryPoint: 'main' }
      });
    };

    // 1. External Forces
    this.extForcesPipeline = createComputePipeline(`
      ${uniformsStruct}
      @group(0) @binding(1) var<storage, read> positions: array<vec2<f32>>;
      @group(0) @binding(2) var<storage, read_write> velocities: array<vec2<f32>>;
      @group(0) @binding(3) var<storage, read_write> predicted: array<vec2<f32>>;

      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.particleCount) { return; }
        var vel = velocities[i];
        let pos = positions[i];
        vel += u.gravity * u.dt;
        if (u.mouseActive != 0.0) {
          let mp = vec2<f32>(u.mouseX, u.mouseY);
          let diff = mp - pos;
          let dist = length(diff);
          if (dist < u.mouseRadius && dist > 0.001) {
            let dir = diff / dist;
            let t = 1.0 - dist / u.mouseRadius;
            vel += dir * u.mouseStrength * t * u.dt;
          }
        }
        velocities[i] = vel;
        predicted[i] = pos + vel * u.dt;
      }
    `, 'extForces');

    // 2. Clear Cells
    this.clearCellsPipeline = createComputePipeline(`
      ${uniformsStruct}
      @group(0) @binding(1) var<storage, read_write> cellCount: array<u32>;
      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.tableSize) { return; }
        cellCount[i] = 0u;
      }
    `, 'clearCells');

    // 3. Hash
    this.hashPipeline = createComputePipeline(`
      ${uniformsStruct}
      ${hashFunctions}
      @group(0) @binding(1) var<storage, read> predicted: array<vec2<f32>>;
      @group(0) @binding(2) var<storage, read_write> keys: array<u32>;
      @group(0) @binding(3) var<storage, read_write> indices: array<u32>;
      @group(0) @binding(4) var<storage, read_write> cellCount: array<atomic<u32>>;

      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.particleCount) { return; }
        let cell = cellCoord(predicted[i]);
        let h = hashCell(cell.x, cell.y);
        keys[i] = h;
        indices[i] = i;
        atomicAdd(&cellCount[h], 1u);
      }
    `, 'hash');

    // 4. Prefix Sum
    this.prefixSumPipeline = createComputePipeline(`
      ${uniformsStruct}
      @group(0) @binding(1) var<storage, read> input: array<u32>;
      @group(0) @binding(2) var<storage, read_write> output: array<u32>;
      @group(0) @binding(3) var<storage, read_write> cellOffset: array<u32>;

      @compute @workgroup_size(1)
      fn main() {
        var sum = 0u;
        for (var i = 0u; i < u.tableSize; i++) {
          cellOffset[i] = sum;
          output[i] = sum;
          sum += input[i];
        }
      }
    `, 'prefixSum');

    // 5. Scatter
    this.scatterPipeline = createComputePipeline(`
      ${uniformsStruct}
      @group(0) @binding(1) var<storage, read> keys: array<u32>;
      @group(0) @binding(2) var<storage, read> indices: array<u32>;
      @group(0) @binding(3) var<storage, read_write> cellOffset: array<atomic<u32>>;
      @group(0) @binding(4) var<storage, read_write> sortedKeys: array<u32>;
      @group(0) @binding(5) var<storage, read_write> sortedIndices: array<u32>;

      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.particleCount) { return; }
        let k = keys[i];
        let dest = atomicAdd(&cellOffset[k], 1u);
        sortedKeys[dest] = k;
        sortedIndices[dest] = indices[i];
      }
    `, 'scatter');

    // 6. Build Offsets 1 & 2
    this.buildOffsetsPipeline = createComputePipeline(`
      ${uniformsStruct}
      @group(0) @binding(2) var<storage, read_write> cellOffset: array<u32>;

      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.tableSize) { return; }
        cellOffset[i] = 0xFFFFFFFFu;
      }
    `, 'buildOffsets');

    this.buildOffsets2Pipeline = createComputePipeline(`
      ${uniformsStruct}
      @group(0) @binding(1) var<storage, read> sortedKeys: array<u32>;
      @group(0) @binding(2) var<storage, read_write> cellOffset: array<u32>;

      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.particleCount) { return; }
        let key = sortedKeys[i];
        if (i == 0u || sortedKeys[i - 1u] != key) {
          cellOffset[key] = i;
        }
      }
    `, 'buildOffsets2');

    // 7. Density
    this.densityPipeline = createComputePipeline(`
      ${uniformsStruct}
      ${hashFunctions}
      @group(0) @binding(1) var<storage, read> predicted: array<vec2<f32>>;
      @group(0) @binding(2) var<storage, read_write> densities: array<vec2<f32>>;
      @group(0) @binding(3) var<storage, read> sortedIndices: array<u32>;
      @group(0) @binding(4) var<storage, read> cellOffset: array<u32>;
      @group(0) @binding(5) var<storage, read> cellCount: array<u32>;

      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.particleCount) { return; }
        let posI = predicted[i];
        let cell = cellCoord(posI);
        var density = 0.0;
        var nearDensity = 0.0;
        let h = u.h;
        let h2 = u.h2;

        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            let cx = cell.x + dx;
            let cy = cell.y + dy;
            let ch = hashCell(cx, cy);
            let start = cellOffset[ch];
            if (start == 0xFFFFFFFFu) { continue; }
            let count = cellCount[ch];

            for (var k = 0u; k < count; k++) {
              let j = sortedIndices[start + k];
              let diff = predicted[j] - posI;
              let r2 = dot(diff, diff);
              if (r2 >= h2) { continue; }
              let w = h2 - r2;
              density += u.poly6 * w * w * w;
              let r = sqrt(r2);
              let q = (h - r) / h;
              nearDensity += u.spikyGrad2 * q * q * q;
            }
          }
        }
        densities[i] = vec2<f32>(density, nearDensity);
      }
    `, 'density');

    // 8. Pressure
    this.pressurePipeline = createComputePipeline(`
      ${uniformsStruct}
      ${hashFunctions}
      @group(0) @binding(1) var<storage, read> predicted: array<vec2<f32>>;
      @group(0) @binding(2) var<storage, read_write> velocities: array<vec2<f32>>;
      @group(0) @binding(3) var<storage, read> densities: array<vec2<f32>>;
      @group(0) @binding(4) var<storage, read> sortedIndices: array<u32>;
      @group(0) @binding(5) var<storage, read> cellOffset: array<u32>;
      @group(0) @binding(6) var<storage, read> cellCount: array<u32>;

      fn pressureFromDensity(d: f32) -> f32 {
        return (d - u.targetDensity) * u.pressureMultiplier;
      }
      fn cohesionWeight(r: f32, h: f32) -> f32 {
        let hHalf = h * 0.5;
        let hr = h - r;
        let hr3 = hr * hr * hr;
        let r3 = r * r * r;
        if (r > hHalf) {
          return u.cohesionKernel * hr3 * r3;
        } else {
          let h6_64 = h * h * h * h * h * h / 64.0;
          return u.cohesionKernel * (2.0 * hr3 * r3 - h6_64);
        }
      }

      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.particleCount) { return; }
        let posI = predicted[i];
        let cell = cellCoord(posI);
        let densI = densities[i];
        let pressI = pressureFromDensity(densI.x);
        let nearPressI = densI.y * u.nearPressureMultiplier;
        var force = vec2<f32>(0.0);
        var surfaceTensionForce = vec2<f32>(0.0);
        let h = u.h;
        let h2 = u.h2;
        let st = u.surfaceTension;

        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            let cx = cell.x + dx;
            let cy = cell.y + dy;
            let ch = hashCell(cx, cy);
            let start = cellOffset[ch];
            if (start == 0xFFFFFFFFu) { continue; }
            let count = cellCount[ch];

            for (var k = 0u; k < count; k++) {
              let j = sortedIndices[start + k];
              if (j == i) { continue; }
              let diff = predicted[j] - posI;
              let r2 = dot(diff, diff);
              if (r2 >= h2 || r2 < 0.0001) { continue; }

              let r = sqrt(r2);
              let dir = diff / r;
              let q = h - r;
              let densJ = densities[j];
              let pressJ = pressureFromDensity(densJ.x);
              let avgDensity = (densI.x + densJ.x) * 0.5;
              let sharedPressure = (pressI + pressJ) * 0.5;

              let gradW = u.spikyGrad * q * q;
              force += dir * sharedPressure * gradW / max(avgDensity, 0.001);

              let qn = (h - r) / h;
              let nearPressJ = densJ.y * u.nearPressureMultiplier;
              let sharedNear = (nearPressI + nearPressJ) * 0.5;
              let nearGradW = -3.0 * u.spikyGrad2 * qn * qn / h;
              force += dir * sharedNear * nearGradW / max(avgDensity, 0.001);

              if (st > 0.0) {
                let cw = cohesionWeight(r, h);
                let corrFactor = 2.0 * u.targetDensity / max(densI.x + densJ.x, 0.001);
                surfaceTensionForce -= dir * st * cw * corrFactor;
              }
            }
          }
        }
        velocities[i] += (force + surfaceTensionForce) * u.dt;
      }
    `, 'pressure');

    // 9. Viscosity
    this.viscosityPipeline = createComputePipeline(`
      ${uniformsStruct}
      ${hashFunctions}
      @group(0) @binding(1) var<storage, read> predicted: array<vec2<f32>>;
      @group(0) @binding(2) var<storage, read_write> velocities: array<vec2<f32>>;
      @group(0) @binding(3) var<storage, read> sortedIndices: array<u32>;
      @group(0) @binding(4) var<storage, read> cellOffset: array<u32>;
      @group(0) @binding(5) var<storage, read> cellCount: array<u32>;

      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.particleCount) { return; }
        let posI = predicted[i];
        let velI = velocities[i];
        let cell = cellCoord(posI);
        var velDelta = vec2<f32>(0.0);
        let h = u.h;
        let h2 = u.h2;
        var count_n = 0.0;

        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            let cx = cell.x + dx;
            let cy = cell.y + dy;
            let ch = hashCell(cx, cy);
            let start = cellOffset[ch];
            if (start == 0xFFFFFFFFu) { continue; }
            let count = cellCount[ch];

            for (var k = 0u; k < count; k++) {
              let j = sortedIndices[start + k];
              if (j == i) { continue; }
              let diff = predicted[j] - posI;
              let r2 = dot(diff, diff);
              if (r2 >= h2) { continue; }
              let r = sqrt(r2);
              let q = h - r;
              let w = u.viscLap * q;
              velDelta += (velocities[j] - velI) * w;
              count_n += 1.0;
            }
          }
        }
        if (count_n > 0.0) {
          velocities[i] = velI + velDelta * u.viscosityStrength * u.dt / max(count_n, 1.0);
        }
      }
    `, 'viscosity');

    // 10. Integrate & Boundary Collision
    this.integratePipeline = createComputePipeline(`
      ${uniformsStruct}
      @group(0) @binding(1) var<storage, read_write> positions: array<vec2<f32>>;
      @group(0) @binding(2) var<storage, read_write> velocities: array<vec2<f32>>;

      @compute @workgroup_size(${WORKGROUP_SIZE})
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i >= u.particleCount) { return; }
        var pos = positions[i];
        var vel = velocities[i];
        pos += vel * u.dt;
        let damp = u.collisionDamping;

        if (pos.x < u.boundsMinX) { pos.x = u.boundsMinX; vel.x = abs(vel.x) * damp; }
        if (pos.x > u.boundsMaxX) { pos.x = u.boundsMaxX; vel.x = -abs(vel.x) * damp; }
        if (pos.y < u.boundsMinY) { pos.y = u.boundsMinY; vel.y = abs(vel.y) * damp; }
        if (pos.y > u.boundsMaxY) { pos.y = u.boundsMaxY; vel.y = -abs(vel.y) * damp; }

        positions[i] = pos;
        velocities[i] = vel;
      }
    `, 'integrate');

    // 11. Render Pipeline (Instanced Quads)
    const vsModule = this.device.createShaderModule({
      code: `
        struct Uniforms {
          viewProj: mat4x4<f32>,
          particleRadius: f32,
          velMax: f32,
          pad0: f32,
          pad1: f32,
        };
        @group(0) @binding(0) var<uniform> ru: Uniforms;
        @group(0) @binding(1) var<storage, read> positions: array<vec2<f32>>;
        @group(0) @binding(2) var<storage, read> velocities: array<vec2<f32>>;

        struct VertexOut {
          @builtin(position) pos: vec4<f32>,
          @location(0) uv: vec2<f32>,
          @location(1) speed: f32,
        };

        @vertex
        fn vs_main(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VertexOut {
          let corners = array<vec2<f32>, 6>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>( 1.0, -1.0),
            vec2<f32>( 1.0,  1.0),
            vec2<f32>(-1.0, -1.0),
            vec2<f32>( 1.0,  1.0),
            vec2<f32>(-1.0,  1.0),
          );
          let corner = corners[vid];
          let center = positions[iid];
          let vel = velocities[iid];
          let r = ru.particleRadius;
          let worldPos = vec4<f32>(center + corner * r, 0.0, 1.0);

          var out: VertexOut;
          out.pos = ru.viewProj * worldPos;
          out.uv = corner;
          out.speed = length(vel) / max(ru.velMax, 0.001);
          return out;
        }
      `,
      label: 'particleVS'
    });

    const fsModule = this.device.createShaderModule({
      code: `
        @group(0) @binding(3) var<storage, read> gradient: array<vec4<f32>>;
        struct FragIn {
          @location(0) uv: vec2<f32>,
          @location(1) speed: f32,
        };
        @fragment
        fn fs_main(input: FragIn) -> @location(0) vec4<f32> {
          let dist = length(input.uv);
          if (dist > 1.0) { discard; }
          let s = clamp(input.speed, 0.0, 1.0);
          let idx = s * 255.0;
          let i0 = u32(floor(idx));
          let i1 = min(i0 + 1u, 255u);
          let t = fract(idx);
          let color = mix(gradient[i0], gradient[i1], t);
          let alpha = smoothstep(1.0, 0.65, dist);
          return vec4<f32>(color.rgb, alpha);
        }
      `,
      label: 'particleFS'
    });

    const renderBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } }
      ]
    });

    this.particleRenderPipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
      vertex: { module: vsModule, entryPoint: 'vs_main' },
      fragment: {
        module: fsModule,
        entryPoint: 'fs_main',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
          }
        }]
      },
      primitive: { topology: 'triangle-list' }
    });

    this.bgRender = this.device.createBindGroup({
      layout: renderBGL,
      entries: [
        { binding: 0, resource: { buffer: this.renderUniformBuffer! } },
        { binding: 1, resource: { buffer: this.positionsBuffer! } },
        { binding: 2, resource: { buffer: this.velocitiesBuffer! } },
        { binding: 3, resource: { buffer: this.gradientBuffer! } }
      ]
    });

    // Line Pipeline for Boundary Box Frame
    const lineVSModule = this.device.createShaderModule({
      code: `
        struct Uniforms {
          viewProj: mat4x4<f32>,
          particleRadius: f32,
          velMax: f32,
          pad0: f32,
          pad1: f32,
        };
        @group(0) @binding(0) var<uniform> ru: Uniforms;
        @vertex
        fn vs_main(@location(0) pos: vec2<f32>) -> @builtin(position) vec4<f32> {
          return ru.viewProj * vec4<f32>(pos, 0.0, 1.0);
        }
      `,
      label: 'lineVS'
    });

    const lineFSModule = this.device.createShaderModule({
      code: `
        @fragment
        fn fs_main() -> @location(0) vec4<f32> {
          return vec4<f32>(0.78, 0.71, 0.55, 0.35); // Subtle gold boundary frame
        }
      `,
      label: 'lineFS'
    });

    const lineBGL = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }
      ]
    });

    this.linePipeline = this.device.createRenderPipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [lineBGL] }),
      vertex: {
        module: lineVSModule,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }]
        }]
      },
      fragment: {
        module: lineFSModule,
        entryPoint: 'fs_main',
        targets: [{
          format: this.format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
          }
        }]
      },
      primitive: { topology: 'line-list' }
    });

    this.lineBindGroup = this.device.createBindGroup({
      layout: lineBGL,
      entries: [{ binding: 0, resource: { buffer: this.renderUniformBuffer! } }]
    });
  }

  private createBindGroups(): void {
    if (!this.device) return;

    this.bgExtForces = this.device.createBindGroup({
      layout: this.extForcesPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.positionsBuffer! } },
        { binding: 2, resource: { buffer: this.velocitiesBuffer! } },
        { binding: 3, resource: { buffer: this.predictedBuffer! } }
      ]
    });

    this.bgClearCells = this.device.createBindGroup({
      layout: this.clearCellsPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.cellCountBuffer! } }
      ]
    });

    this.bgHash = this.device.createBindGroup({
      layout: this.hashPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.predictedBuffer! } },
        { binding: 2, resource: { buffer: this.keysBuffer! } },
        { binding: 3, resource: { buffer: this.indicesBuffer! } },
        { binding: 4, resource: { buffer: this.cellCountBuffer! } }
      ]
    });

    this.bgPrefixSum = this.device.createBindGroup({
      layout: this.prefixSumPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.cellCountBuffer! } },
        { binding: 2, resource: { buffer: this.prefixSumABuffer! } },
        { binding: 3, resource: { buffer: this.cellOffsetBuffer! } }
      ]
    });

    this.bgScatter = this.device.createBindGroup({
      layout: this.scatterPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.keysBuffer! } },
        { binding: 2, resource: { buffer: this.indicesBuffer! } },
        { binding: 3, resource: { buffer: this.cellOffsetBuffer! } },
        { binding: 4, resource: { buffer: this.sortedKeysBuffer! } },
        { binding: 5, resource: { buffer: this.sortedIndicesBuffer! } }
      ]
    });

    this.bgBuildOffsets = this.device.createBindGroup({
      layout: this.buildOffsetsPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 2, resource: { buffer: this.cellOffsetBuffer! } }
      ]
    });

    this.bgBuildOffsets2 = this.device.createBindGroup({
      layout: this.buildOffsets2Pipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.sortedKeysBuffer! } },
        { binding: 2, resource: { buffer: this.cellOffsetBuffer! } }
      ]
    });

    this.bgDensity = this.device.createBindGroup({
      layout: this.densityPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.predictedBuffer! } },
        { binding: 2, resource: { buffer: this.densitiesBuffer! } },
        { binding: 3, resource: { buffer: this.sortedIndicesBuffer! } },
        { binding: 4, resource: { buffer: this.cellOffsetBuffer! } },
        { binding: 5, resource: { buffer: this.cellCountBuffer! } }
      ]
    });

    this.bgPressure = this.device.createBindGroup({
      layout: this.pressurePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.predictedBuffer! } },
        { binding: 2, resource: { buffer: this.velocitiesBuffer! } },
        { binding: 3, resource: { buffer: this.densitiesBuffer! } },
        { binding: 4, resource: { buffer: this.sortedIndicesBuffer! } },
        { binding: 5, resource: { buffer: this.cellOffsetBuffer! } },
        { binding: 6, resource: { buffer: this.cellCountBuffer! } }
      ]
    });

    this.bgViscosity = this.device.createBindGroup({
      layout: this.viscosityPipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.predictedBuffer! } },
        { binding: 2, resource: { buffer: this.velocitiesBuffer! } },
        { binding: 3, resource: { buffer: this.sortedIndicesBuffer! } },
        { binding: 4, resource: { buffer: this.cellOffsetBuffer! } },
        { binding: 5, resource: { buffer: this.cellCountBuffer! } }
      ]
    });

    this.bgIntegrate = this.device.createBindGroup({
      layout: this.integratePipeline!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformsBuffer! } },
        { binding: 1, resource: { buffer: this.positionsBuffer! } },
        { binding: 2, resource: { buffer: this.velocitiesBuffer! } }
      ]
    });
  }

  private uploadUniforms(dt: number): void {
    if (!this.device || !this.uniformsBuffer) return;
    const k = computeKernelConstants(this.config.smoothingRadius);
    const pad = 0.3;

    this.uniformF32[0] = 0;
    this.uniformF32[1] = this.config.gravity;
    this.uniformF32[2] = dt;
    this.uniformU32[3] = this.particleCount;
    this.uniformF32[4] = k.h;
    this.uniformF32[5] = this.config.targetDensity;
    this.uniformF32[6] = this.config.pressureMultiplier;
    this.uniformF32[7] = this.config.nearPressureMultiplier;
    this.uniformF32[8] = this.config.viscosityStrength;
    this.uniformF32[9] = this.config.collisionDamping;
    this.uniformF32[10] = this.bounds.minX + pad;
    this.uniformF32[11] = this.bounds.minY + pad;
    this.uniformF32[12] = this.bounds.maxX - pad;
    this.uniformF32[13] = this.bounds.maxY - pad;
    this.uniformF32[14] = k.poly6;
    this.uniformF32[15] = k.spikyGrad;
    this.uniformF32[16] = k.nearKernel;
    this.uniformF32[17] = k.viscLap;
    this.uniformF32[18] = k.h;
    this.uniformF32[19] = k.h2;
    this.uniformF32[20] = this.mouseState.worldX;
    this.uniformF32[21] = this.mouseState.worldY;
    this.uniformF32[22] = this.mouseState.active;
    this.uniformF32[23] = this.mouseState.strength;
    this.uniformF32[24] = this.config.interactionRadius;
    this.uniformU32[25] = GRID_SIZE;
    this.uniformU32[26] = TABLE_SIZE;
    this.uniformF32[27] = 0; // obstacle minX
    this.uniformF32[28] = 0; // obstacle minY
    this.uniformF32[29] = 0; // obstacle maxX
    this.uniformF32[30] = 0; // obstacle maxY
    this.uniformF32[31] = this.config.surfaceTension;
    this.uniformF32[32] = k.cohesion;

    this.device.queue.writeBuffer(this.uniformsBuffer, 0, this.uniformStaging, 0, 256);
  }

  private uploadRenderUniforms(): void {
    if (!this.device || !this.renderUniformBuffer) return;
    const l = this.bounds.minX, r = this.bounds.maxX, b = this.bounds.minY, t = this.bounds.maxY;
    const n = -1, f = 1;

    this.renderUniformStaging[0] = 2 / (r - l);
    this.renderUniformStaging[1] = 0;
    this.renderUniformStaging[2] = 0;
    this.renderUniformStaging[3] = 0;
    this.renderUniformStaging[4] = 0;
    this.renderUniformStaging[5] = 2 / (t - b);
    this.renderUniformStaging[6] = 0;
    this.renderUniformStaging[7] = 0;
    this.renderUniformStaging[8] = 0;
    this.renderUniformStaging[9] = 0;
    this.renderUniformStaging[10] = -2 / (f - n);
    this.renderUniformStaging[11] = 0;
    this.renderUniformStaging[12] = -(r + l) / (r - l);
    this.renderUniformStaging[13] = -(t + b) / (t - b);
    this.renderUniformStaging[14] = -(f + n) / (f - n);
    this.renderUniformStaging[15] = 1;
    this.renderUniformStaging[16] = this.config.particleRadius * 0.05;
    this.renderUniformStaging[17] = this.config.velocityDisplayMax;
    this.renderUniformStaging[18] = 0;
    this.renderUniformStaging[19] = 0;

    this.device.queue.writeBuffer(this.renderUniformBuffer, 0, this.renderUniformStaging);
  }

  private uploadLineGeometry(): number {
    if (!this.device || !this.lineVertexBuffer) return 0;
    const pad = 0.3;
    const x0 = this.bounds.minX + pad;
    const x1 = this.bounds.maxX - pad;
    const y0 = this.bounds.minY + pad;
    const y1 = this.bounds.maxY - pad;
    const verts = [
      x0, y0, x1, y0,
      x1, y0, x1, y1,
      x1, y1, x0, y1,
      x0, y1, x0, y0
    ];
    this.device.queue.writeBuffer(this.lineVertexBuffer, 0, new Float32Array(verts));
    return 8;
  }

  private renderFrame(now: number): void {
    if (!this.device || !this.ctx || !this.particleRenderPipeline || !this.bgRender) return;

    // Calculate FPS
    this.frameCount++;
    if (this.frameCount === 1) {
      console.warn('[Fluid RenderFrame #1]', {
        particleCount: this.particleCount,
        bounds: this.bounds,
        canvasW: this.canvas?.width,
        canvasH: this.canvas?.height
      });
    }
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    if (this.isPaused) {
      this.uploadRenderUniforms();
      const enc = this.device.createCommandEncoder();
      const pass = enc.beginRenderPass({
        colorAttachments: [{
          view: this.ctx.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0.03, g: 0.04, b: 0.06, a: 1 },
          storeOp: 'store'
        }]
      });
      if (this.linePipeline && this.lineBindGroup && this.lineVertexBuffer) {
        const lineCount = this.uploadLineGeometry();
        pass.setPipeline(this.linePipeline);
        pass.setBindGroup(0, this.lineBindGroup);
        pass.setVertexBuffer(0, this.lineVertexBuffer);
        pass.draw(lineCount);
      }
      pass.setPipeline(this.particleRenderPipeline);
      pass.setBindGroup(0, this.bgRender);
      pass.draw(6, this.particleCount);
      pass.end();
      this.device.queue.submit([enc.finish()]);
      return;
    }

    let rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    rawDt = Math.min(rawDt, 1 / 30);
    const dt = rawDt * this.config.timeScale;

    const substeps = this.config.substeps;
    const subDt = dt / substeps;
    const pDispatches = Math.ceil(this.particleCount / WORKGROUP_SIZE);
    const tDispatches = Math.ceil(TABLE_SIZE / WORKGROUP_SIZE);

    const enc = this.device.createCommandEncoder();

    for (let s = 0; s < substeps; s++) {
      this.uploadUniforms(subDt);

      const pass = enc.beginComputePass();

      // 1. External forces
      pass.setPipeline(this.extForcesPipeline!);
      pass.setBindGroup(0, this.bgExtForces!);
      pass.dispatchWorkgroups(pDispatches);

      // 2. Clear cell counts
      pass.setPipeline(this.clearCellsPipeline!);
      pass.setBindGroup(0, this.bgClearCells!);
      pass.dispatchWorkgroups(tDispatches);

      // 3. Hash
      pass.setPipeline(this.hashPipeline!);
      pass.setBindGroup(0, this.bgHash!);
      pass.dispatchWorkgroups(pDispatches);

      // 4. Prefix sum
      pass.setPipeline(this.prefixSumPipeline!);
      pass.setBindGroup(0, this.bgPrefixSum!);
      pass.dispatchWorkgroups(1);

      // 5. Scatter
      pass.setPipeline(this.scatterPipeline!);
      pass.setBindGroup(0, this.bgScatter!);
      pass.dispatchWorkgroups(pDispatches);

      // 6. Build offsets
      pass.setPipeline(this.buildOffsetsPipeline!);
      pass.setBindGroup(0, this.bgBuildOffsets!);
      pass.dispatchWorkgroups(tDispatches);

      pass.setPipeline(this.buildOffsets2Pipeline!);
      pass.setBindGroup(0, this.bgBuildOffsets2!);
      pass.dispatchWorkgroups(pDispatches);

      // 7. Density
      pass.setPipeline(this.densityPipeline!);
      pass.setBindGroup(0, this.bgDensity!);
      pass.dispatchWorkgroups(pDispatches);

      // 8. Pressure
      pass.setPipeline(this.pressurePipeline!);
      pass.setBindGroup(0, this.bgPressure!);
      pass.dispatchWorkgroups(pDispatches);

      // 9. Viscosity
      pass.setPipeline(this.viscosityPipeline!);
      pass.setBindGroup(0, this.bgViscosity!);
      pass.dispatchWorkgroups(pDispatches);

      // 10. Integrate
      pass.setPipeline(this.integratePipeline!);
      pass.setBindGroup(0, this.bgIntegrate!);
      pass.dispatchWorkgroups(pDispatches);

      pass.end();
    }

    // Render pass
    this.uploadRenderUniforms();
    const renderPass = enc.beginRenderPass({
      colorAttachments: [{
        view: this.ctx.getCurrentTexture().createView(),
        loadOp: 'clear',
        clearValue: { r: 0.03, g: 0.04, b: 0.06, a: 1 },
        storeOp: 'store'
      }]
    });

    if (this.linePipeline && this.lineBindGroup && this.lineVertexBuffer) {
      const lineCount = this.uploadLineGeometry();
      renderPass.setPipeline(this.linePipeline);
      renderPass.setBindGroup(0, this.lineBindGroup);
      renderPass.setVertexBuffer(0, this.lineVertexBuffer);
      renderPass.draw(lineCount);
    }

    renderPass.setPipeline(this.particleRenderPipeline);
    renderPass.setBindGroup(0, this.bgRender);
    renderPass.draw(6, this.particleCount);
    renderPass.end();

    this.device.queue.submit([enc.finish()]);
  }
}
