import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test('Fluid custom colors and exact particle count update paused artwork and persist into Lightform', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/WebGPU Uncaptured Error|Invalid BindGroup|Invalid CommandBuffer/.test(message.text())) errors.push(message.text()); });
  await page.goto('/lab?mode=wave');
  expect(await page.evaluate(async () => Boolean(await navigator.gpu?.requestAdapter()))).toBe(true);
  const canvas = page.locator('.fluid-webgpu-canvas');
  await expect(canvas).toHaveAttribute('data-particle-count', '3000');
  await page.getByRole('button', { name: '暂停模拟' }).click();
  await page.getByRole('slider', { name: '粒子数量' }).fill('1500');
  await expect(canvas).toHaveAttribute('data-particle-count', '1500');
  await expect(page.locator('.fluid-stats-pill')).toContainText('1,500 微粒');
  const start = page.getByLabel('低速颜色', { exact: true });
  const end = page.getByLabel('高速颜色', { exact: true });
  const coloredPixels = async (kind: 'green' | 'magenta') => {
    const { data, info } = await sharp(await canvas.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let pixels = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const [r, g, b] = data.subarray(i * 3, i * 3 + 3);
      if (kind === 'green' ? g > 80 && g > r + 50 && g > b + 30 : r > 80 && b > 80 && r > g + 50 && b > g + 50) pixels++;
    }
    return pixels;
  };
  await start.fill('#00ff44'); await end.fill('#00ff44');
  await expect(page.getByRole('button', { name: '自定义渐变', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => coloredPixels('green')).toBeGreaterThan(500);
  await start.fill('#ff00ff'); await end.fill('#ff00ff');
  await expect.poll(() => coloredPixels('magenta')).toBeGreaterThan(500);
  await expect(page.getByRole('button', { name: '继续模拟' })).toBeVisible();
  await page.locator('.lab-rail-item[data-module="day"]').click();
  await page.locator('.lab-rail-item[data-module="wave"]').click();
  await expect(start).toHaveValue('#ff00ff'); await expect(end).toHaveValue('#ff00ff');
  await expect(canvas).toHaveAttribute('data-particle-count', '1500');
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 20_000 });
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await page.getByRole('button', { name: /使用 Fluid 实时画面/ }).click();
  const live = page.locator('.fluid-live-canvas');
  await expect(live).toHaveAttribute('data-particle-count', '1500');
  await expect(page.locator('.media-meta')).toContainText('FLUID LIVE');
  const { data } = await sharp(await live.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let magenta = 0;
  for (let i = 0; i < data.length; i += 3) if (data[i] > 80 && data[i + 2] > 80 && data[i] > data[i + 1] + 50 && data[i + 2] > data[i + 1] + 50) magenta++;
  expect(magenta).toBeGreaterThan(100);
  await page.locator('.lab-rail-item[data-module="wave"]').click();
  await page.getByRole('button', { name: '重置模拟' }).click();
  await expect(canvas).toHaveAttribute('data-particle-count', '3000');
  await expect(start).toHaveValue('#7c5cff'); await expect(end).toHaveValue('#26e0cb');
  await expect(page.locator('.toolbar-btn[title="暖金 3000K"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '切换为英文' }).first().click();
  await expect(page.getByRole('slider', { name: 'Particle count' })).toHaveValue('3000');
  await expect(page.getByLabel('Low-speed color', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('Fluid count limits render without GPU errors or recreating the canvas', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (/WebGPU Uncaptured Error|Invalid BindGroup|Invalid CommandBuffer/.test(message.text())) errors.push(message.text()); });
  await page.goto('/lab?mode=wave');
  const canvas = page.locator('.fluid-webgpu-canvas');
  await expect(canvas).toHaveAttribute('data-particle-count', '3000');
  await canvas.evaluate(element => { element.dataset.instance = 'original'; });
  for (const count of ['500', '10000']) {
    await page.getByRole('slider', { name: '粒子数量' }).fill(count);
    await expect(canvas).toHaveAttribute('data-particle-count', count);
    await expect(canvas).toHaveAttribute('data-instance', 'original');
    await page.waitForTimeout(800);
    const { data } = await sharp(await canvas.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let lit = 0;
    for (let i = 0; i < data.length; i += 3) if (data[i] + data[i + 1] + data[i + 2] > 300) lit++;
    expect(lit).toBeGreaterThan(100);
  }
  expect(errors).toEqual([]);
});

test('WebGPU fluid light renders particles without GPU validation errors', async ({ page }) => {
  const gpuErrors: string[] = [];
  page.on('console', message => {
    if (/WebGPU Uncaptured Error|Invalid BindGroup|Invalid CommandBuffer/.test(message.text())) {
      gpuErrors.push(message.text());
    }
  });

  await page.goto('/lab?mode=wave');
  await expect(page.locator('.lab-workbench')).toHaveAttribute('data-mode', 'wave');

  const adapterAvailable = await page.evaluate(async () =>
    Boolean(await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' }))
  );
  if (!adapterAvailable) {
    await expect(page.locator('.fluid-fallback-wrap')).toBeVisible();
    return;
  }

  const canvas = page.locator('.fluid-webgpu-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.fluid-stats-pill')).toContainText('3,000 微粒');
  await page.waitForTimeout(1200);

  const image = await canvas.screenshot();
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let litPixels = 0;
  for (let y = Math.floor(info.height * 0.2); y < Math.floor(info.height * 0.7); y++) {
    for (let x = Math.floor(info.width * 0.2); x < Math.floor(info.width * 0.9); x++) {
      const offset = (y * info.width + x) * info.channels;
      if (data[offset] + data[offset + 1] + data[offset + 2] > 330) litPixels++;
    }
  }

  expect(litPixels).toBeGreaterThan(100);
  expect(gpuErrors).toEqual([]);
});

test('fluid engine initializes only for the active module and stops in a hidden tab', async ({ page }) => {
  await page.goto('/lab');
  await expect(page.locator('.fluid-webgpu-canvas')).toHaveCount(0);
  await page.locator('.lab-rail-item[data-module="wave"]').click();
  await expect(page.locator('.lab-workbench')).toHaveAttribute('data-mode', 'wave');

  const adapterAvailable = await page.evaluate(async () =>
    Boolean(await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' }))
  );
  if (!adapterAvailable) {
    await expect(page.locator('.fluid-fallback-wrap')).toBeVisible();
    return;
  }

  const viewport = page.locator('.fluid-viewport-container');
  await expect(viewport).toHaveAttribute('data-rendering', 'true');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(viewport).toHaveAttribute('data-rendering', 'false');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(viewport).toHaveAttribute('data-rendering', 'true');
  await page.getByRole('slider', { name: '调节环境重力加速度' }).fill('-4');
  await expect(page.locator('.fluid-control-group').first()).toContainText('-4.0');
  await page.locator('.lab-rail-item[data-module="day"]').click();
  await expect(page.locator('.fluid-webgpu-canvas')).toHaveCount(0);
  await page.locator('.lab-rail-item[data-module="wave"]').click();
  await expect(page.getByRole('slider', { name: '调节环境重力加速度' })).toHaveValue('-4');
});

test('Fluid Live keeps one WebGPU stream across all Lightform scenes and releases it on exit', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.captureStream;
    (window as typeof window & { __fluidTracks?: MediaStreamTrack[]; __cameraCalls?: number }).__fluidTracks = [];
    (window as typeof window & { __cameraCalls: number }).__cameraCalls = 0;
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (...args) => {
      (window as typeof window & { __cameraCalls: number }).__cameraCalls++;
      return getUserMedia(...args);
    };
    HTMLCanvasElement.prototype.captureStream = function (fps?: number) {
      const stream = original.call(this, fps);
      if (this.width === 960 && this.height === 540) (window as typeof window & { __fluidTracks: MediaStreamTrack[] }).__fluidTracks.push(...stream.getVideoTracks());
      return stream;
    };
  });
  await page.goto('/lab?mode=wave');
  const adapterAvailable = await page.evaluate(async () => Boolean(await navigator.gpu?.requestAdapter()));
  if (!adapterAvailable) { await expect(page.locator('.fluid-fallback-wrap')).toBeVisible(); return; }
  await expect(page.locator('.fluid-viewport-container')).toHaveAttribute('data-rendering', 'true');
  await page.getByRole('slider', { name: '调节环境重力加速度' }).fill('-4');
  await page.locator('.fluid-light .toolbar-btn[title="极光 6000K"]').click();
  const fluidDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PNG' }).click();
  expect((await fluidDownload).suggestedFilename()).toBe('fluid-light.png');
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await page.getByRole('button', { name: /使用 Fluid 实时画面/ }).click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('Fluid Live');
  await expect(page.locator('.lightform-studio .live-preview-body')).toContainText('拖动吸引');
  const canvas = page.locator('.fluid-live-canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate(element => { (window as typeof window & { __liveCanvas?: Element }).__liveCanvas = element; });
  expect(await page.evaluate(() => (window as typeof window & { __fluidTracks: MediaStreamTrack[] }).__fluidTracks.map(track => track.readyState))).toEqual(['live']);
  expect(await page.evaluate(() => (window as typeof window & { __cameraCalls: number }).__cameraCalls)).toBe(0);
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Fluid interaction canvas has no bounds');
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .65, bounds.y + bounds.height * .4, { steps: 5 });
  await page.mouse.up();
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(bounds.x + bounds.width * .35, bounds.y + bounds.height * .5, { steps: 5 });
  await page.mouse.up({ button: 'right' });
  const before = await canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(350);
  expect(await canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL())).not.toBe(before);
  for (const tab of ['888 Collins', '弧形点阵展馆', '球形展馆']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    expect(await page.evaluate(() => document.querySelector('.fluid-live-canvas') === (window as typeof window & { __liveCanvas?: Element }).__liveCanvas)).toBe(true);
  }
  await page.getByRole('button', { name: '隐藏 Fluid 预览' }).click();
  await expect(page.locator('.live-preview')).toHaveClass(/collapsed/);
  const hiddenBefore = await canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL());
  await page.waitForTimeout(350);
  expect(await canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL())).not.toBe(hiddenBefore);
  const studioDownload = page.waitForEvent('download');
  await page.locator('.lightform-studio .export-button').click();
  expect((await studioDownload).suggestedFilename()).toMatch(/sphere-studio-.*\.png/);
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await page.getByRole('button', { name: /切回原素材/ }).first().click();
  await expect(page.locator('.fluid-live-canvas')).toHaveCount(0);
  expect(await page.evaluate(() => (window as typeof window & { __fluidTracks: MediaStreamTrack[] }).__fluidTracks.map(track => track.readyState))).toEqual(['ended']);
  await page.locator('.lab-rail-item[data-module="wave"]').click();
  await expect(page.getByRole('slider', { name: '调节环境重力加速度' })).toHaveValue('-4');
  await page.getByRole('button', { name: '切换为英文' }).first().click();
  await expect(page.locator('.fluid-inspector-title')).toContainText('Particle controls');
  await expect(page.getByRole('slider', { name: 'Adjust gravity' })).toHaveValue('-4');
  expect(errors).toEqual([]);
});

test('Fluid Live preserves uploaded media when its stream fails and explains missing WebGPU', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.captureStream;
    HTMLCanvasElement.prototype.captureStream = function (fps?: number) {
      if (this.width === 960 && this.height === 540) throw new Error('Stream unavailable');
      return original.call(this, fps);
    };
  });
  await page.goto('/lab?mode=lightform');
  await expect(page.locator('.scene-loading')).toBeHidden({ timeout: 20_000 });
  const image = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#38bed8' } }).png().toBuffer();
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'fallback.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('fallback.png');
  const adapterAvailable = await page.evaluate(async () => Boolean(await navigator.gpu?.requestAdapter()));
  if (!adapterAvailable) {
    await expect(page.getByRole('button', { name: /使用 Fluid 实时画面/ })).toBeDisabled();
    return;
  }
  await page.getByRole('button', { name: /使用 Fluid 实时画面/ }).click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('fallback.png', { timeout: 15_000 });
  await expect(page.locator('.lightform-studio .error-banner')).toContainText('无法启动 Fluid 实时画面');
  await expect(page.locator('.fluid-live-canvas')).toHaveCount(0);
});

test('Fluid Light and its Lightform source explain unavailable WebGPU', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined }));
  await page.goto('/lab?mode=wave');
  await expect(page.locator('.fluid-fallback-wrap')).toContainText('流光粒子需 WebGPU 支持');
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await expect(page.getByRole('button', { name: /使用 Fluid 实时画面/ })).toBeDisabled();
  await expect(page.locator('.live-source-unavailable')).toContainText('Fluid Live 需要 WebGPU 支持');
});
