import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

type Diagnostics = { preset: string; backend: string; paused: boolean; time: number; frames: number;
  instance: number; generation: number; loopCount: number; bridgeCount: number; source: string;
  particles: number; seedGeneration?: number; loading: boolean; control: { x: number; y: number }; interactionSpeed?: number };
const snapshot = (page: Page) => page.locator('.field-art').evaluate(node =>
  (node as HTMLElement & { fieldStudy: { snapshot: () => Diagnostics } }).fieldStudy.snapshot());
const fieldReady = async (page: Page) => {
  await expect(page.locator('.particle-field-canvas')).toBeAttached();
  await expect(page.locator('.field-notice')).toHaveCount(0);
};
const sceneReady = async (page: Page) => {
  await expect(page.locator('.scene-loading')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
};
const openPreview = async (page: Page) => {
  const toggle = page.getByRole('button', { name: '显示粒子流场预览', exact: true });
  if (await toggle.count()) await toggle.click();
};

test('four numbered experiments and two unnumbered displays; Classic startup, controls and translation', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/lab?mode=particles'); await fieldReady(page);
  await expect(page.locator('.lab-rail-label')).toHaveText(['昼夜切换', '流光粒子', '色彩粒子场', '粒子流场', '建筑光影模拟', '测试项']);
  await expect(page.locator('.lab-rail-number')).toHaveText(['01', '02', '03', '04']);
  await expect(page.locator('.lab-rail-item.is-display')).toHaveCount(2);
  expect(await snapshot(page)).toMatchObject({ preset: 'classic', backend: 'canvas2d', particles: 400, bridgeCount: 0, loopCount: 1 });
  expect(requests.some(url => /gpu-field-engine|WebGPUFluidEngine/.test(url))).toBe(false);
  await expect(page.getByRole('button', { name: 'GPU', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '暂停粒子', exact: true }).click();
  const time = (await snapshot(page)).time;
  await page.waitForTimeout(150); expect((await snapshot(page)).time).toBe(time);
  await page.getByRole('slider', { name: /流场圆盘/ }).press('ArrowLeft');
  expect((await snapshot(page)).control.x).toBeLessThan(0);
  await page.getByRole('button', { name: '切换单色', exact: true }).click();
  await expect(page.getByRole('button', { name: '切换单色', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '隐藏粒子控件', exact: true }).click();
  await page.getByRole('button', { name: '显示控件', exact: true }).click();
  await page.getByRole('button', { name: '切换为英文', exact: true }).first().click();
  await expect(page.locator('.lab-rail-label')).toHaveText(['Day / Night', 'Fluid Light', 'Chroma Field', 'Particle Field', 'Lightform Studio', 'Photo Lab']);
  await expect(page.getByRole('button', { name: 'Classic', exact: true })).toBeVisible();
  expect((await snapshot(page)).time).toBe(time);
  await page.getByRole('button', { name: 'Reset particles', exact: true }).click();
  expect((await snapshot(page)).time).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath('particle-classic.png') });
  expect(errors).toEqual([]);
});

test('Canvas five presets keep one running loop; offscreen and other modules suspend without reset', async ({ page }) => {
  await page.goto('/lab?mode=particles'); await fieldReady(page);
  for (const [name, preset] of [['漂流', 'drift'], ['旋涡', 'vortex'], ['极光', 'aurora'], ['星轨', 'orbit'], ['原始', 'classic']]) {
    await page.getByRole('button', { name, exact: true }).click(); await fieldReady(page);
    await expect.poll(async () => (await snapshot(page)).preset).toBe(preset);
    expect((await snapshot(page)).loopCount).toBe(1);
  }
  await page.getByRole('button', { name: '暂停粒子', exact: true }).click();
  const before = await snapshot(page);
  await page.locator('[data-module=day]').click();
  await page.locator('[data-module=particles]').click(); await fieldReady(page);
  expect(await snapshot(page)).toMatchObject({ time: before.time, frames: before.frames, instance: before.instance, generation: before.generation });
  await page.reload(); await fieldReady(page);
  expect(await snapshot(page)).toMatchObject({ preset: 'classic', backend: 'canvas2d', paused: false });
});

test('shared Canvas maps to all six building views, preserves paused frames, and restores stored media', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/lab?mode=particles'); await fieldReady(page);
  await page.getByRole('button', { name: '极光', exact: true }).click(); await fieldReady(page);
  await page.getByRole('button', { name: '暂停粒子', exact: true }).click();
  const before = await snapshot(page);
  for (const module of ['photo', 'lightform']) {
    const transfer = await snapshot(page);
    await page.locator(`[data-module=${module}]`).click();
    await expect(page.locator(module === 'photo' ? '.photo-studio' : '.lightform-studio:not(.photo-studio)')).toBeVisible();
    await sceneReady(page);
    if (module === 'photo') {
      await page.getByRole('button', { name: '显示素材面板', exact: true }).click();
      await page.getByRole('button', { name: /^使用粒子流场实时画面/ }).click();
    } else await openPreview(page);
    await fieldReady(page);
    expect(await snapshot(page)).toMatchObject({ time: before.time, instance: before.instance, frames: before.frames, loopCount: 0 });
    await page.getByRole('slider', { name: /流场圆盘/ }).press('ArrowUp');
    await page.getByRole('button', { name: '隐藏粒子流场预览', exact: true }).click();
    for (const name of ['888 Collins', '弧形点阵展馆', '球形展馆']) {
      await page.getByRole('tab', { name: name.startsWith('弧形') ? /^弧形/ : name, exact: true }).click(); await sceneReady(page);
      await expect(page.locator('.canvas-host')).toHaveAttribute('data-source', 'particles');
      expect((await snapshot(page)).time).toBe(before.time);
      await page.screenshot({ path: testInfo.outputPath(`${module}-${name}-canvas.png`) });
    }
    if (module === 'lightform') {
      await page.getByRole('button', { name: '粒子交互', exact: true }).click();
      await expect(page.getByRole('button', { name: '粒子交互', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: '旋转视角', exact: true }).click();
    }
  }
  await page.locator('[data-module=particles]').click(); await fieldReady(page);
  expect((await snapshot(page)).control.y).toBeGreaterThan(0);
  await page.locator('[data-module=photo]').click(); await sceneReady(page);
  await page.getByRole('button', { name: '显示素材面板', exact: true }).click();
  await page.getByRole('button', { name: /^切回原素材/ }).first().click();
  await expect(page.locator('.canvas-host')).toHaveAttribute('data-source', 'demo');
  await expect(page.locator('.particle-live-preview')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('real WebGPU produces a video texture, all enhanced presets, continuous mapping and paused manual frames', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    if (typeof GPUAdapter === 'undefined') return;
    const request = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function (...args) {
      const device = await request.apply(this, args);
      (window as Window & { particleTestDevice?: GPUDevice }).particleTestDevice = device;
      return device;
    };
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/lab?mode=particles'); await fieldReady(page);
  await page.getByRole('button', { name: '极光', exact: true }).click(); await fieldReady(page);
  await page.getByRole('button', { name: 'GPU', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).backend, { timeout: 20000 }).toBe('webgpu');
  await fieldReady(page);
  expect(await snapshot(page)).toMatchObject({ source: 'video', bridgeCount: 1, loopCount: 1 });
  await page.getByRole('button', { name: '响应', exact: true }).click();
  await page.getByRole('slider', { name: /交互速度/ }).fill('70');
  expect((await snapshot(page)).interactionSpeed).toBe(.7);
  await page.keyboard.press('Escape');
  await expect(page.locator('.field-speed')).toHaveCount(0);
  for (const name of ['漂流', '旋涡', '星轨', '极光']) {
    await page.getByRole('button', { name, exact: true }).click();
    expect((await snapshot(page)).backend).toBe('webgpu');
  }
  await page.getByRole('button', { name: '暂停粒子', exact: true }).click();
  const before = await snapshot(page);
  await page.screenshot({ path: testInfo.outputPath('particle-webgpu.png') });
  for (const module of ['photo', 'lightform']) {
    const transfer = await snapshot(page);
    await page.locator(`[data-module=${module}]`).click();
    await expect(page.locator(module === 'photo' ? '.photo-studio' : '.lightform-studio:not(.photo-studio)')).toBeVisible();
    await sceneReady(page);
    if (module === 'photo') {
      await page.getByRole('button', { name: '显示素材面板', exact: true }).click();
      await page.getByRole('button', { name: /^使用粒子流场实时画面/ }).click();
    } else await openPreview(page);
    await fieldReady(page);
    expect(await snapshot(page)).toMatchObject({ source: 'video', instance: before.instance, time: before.time, frames: before.frames, seedGeneration: transfer.seedGeneration });
    await page.getByRole('button', { name: '隐藏粒子流场预览', exact: true }).click();
    for (const name of ['888 Collins', '弧形点阵展馆', '球形展馆']) {
      await page.getByRole('tab', { name: name.startsWith('弧形') ? /^弧形/ : name, exact: true }).click(); await sceneReady(page);
      await expect(page.locator('.canvas-host')).toHaveAttribute('data-source', 'particles');
    }
    await openPreview(page);
    const image = module === 'photo' ? page.locator('.photo-compositor') : page.locator('.canvas-host canvas');
    const previous = await image.screenshot();
    await page.getByRole('slider', { name: /流场圆盘/ }).press('ArrowRight');
    await expect.poll(async () => (await image.screenshot()).equals(previous), { timeout: 5000 }).toBe(false);
    expect((await snapshot(page)).time).toBe(before.time);
    await page.getByRole('button', { name: '隐藏粒子流场预览', exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`${module}-webgpu.png`) });
  }
  await page.evaluate(() => (window as Window & { particleTestDevice?: GPUDevice }).particleTestDevice?.destroy());
  await expect.poll(async () => (await snapshot(page)).backend, { timeout: 10000 }).toBe('canvas2d');
  await fieldReady(page);
  expect(await snapshot(page)).toMatchObject({ preset: 'aurora', paused: true, bridgeCount: 0, loopCount: 0, source: 'canvas' });
  expect(errors).toEqual([]);
});

test('unavailable WebGPU falls back to the same preset with functional Canvas controls', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true }));
  await page.goto('/lab?mode=particles'); await fieldReady(page);
  await page.getByRole('button', { name: '旋涡', exact: true }).click(); await fieldReady(page);
  await page.getByRole('button', { name: 'GPU', exact: true }).click();
  await expect(page.locator('.field-error')).toContainText('已切回 2D');
  expect(await snapshot(page)).toMatchObject({ preset: 'vortex', backend: 'canvas2d', loopCount: 1, source: 'canvas', bridgeCount: 0 });
  await page.getByRole('slider', { name: /流场圆盘/ }).press('ArrowRight');
  expect((await snapshot(page)).control.x).toBeGreaterThan(0);
});

test('reduced motion starts paused and building compact controls remain usable on mobile', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lab?mode=photo'); await sceneReady(page);
  await page.getByRole('button', { name: '显示素材面板', exact: true }).click();
  await page.getByRole('button', { name: /^使用粒子流场实时画面/ }).click(); await fieldReady(page);
  expect(await snapshot(page)).toMatchObject({ paused: true, loopCount: 0, particles: 400 });
  await page.getByRole('button', { name: '极光', exact: true }).click(); await fieldReady(page);
  await expect(page.getByRole('button', { name: '重置粒子', exact: true })).toBeVisible();
  await page.getByRole('slider', { name: /流场圆盘/ }).press('ArrowLeft');
  expect((await snapshot(page)).control.x).toBeLessThan(0);
  await page.screenshot({ path: testInfo.outputPath('particle-compact.png') });
  await page.getByRole('button', { name: '隐藏粒子流场预览', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出画面', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('collins-photo-lab.png');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});


test('display interaction board fits the viewport and every control is reachable at short heights', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.goto('/lab?mode=photo'); await sceneReady(page);
  await page.getByRole('button', { name: '显示素材面板', exact: true }).click();
  await page.getByRole('button', { name: /^使用粒子流场实时画面/ }).click(); await fieldReady(page);
  const initial = await snapshot(page);
  const sizes = testInfo.project.name === 'mobile'
    ? [{ width: 390, height: 844 }, { width: 390, height: 600 }]
    : [{ width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 600 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    const panel = page.locator('.particle-live-preview');
    await expect(panel).toBeInViewport({ ratio: 1 });
    const bounds = await panel.boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(70);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height);
    const board = page.locator('.particle-field');
    const holder = page.locator('.field-preview-controls');
    const a = await board.boundingBox(), b = await holder.boundingBox();
    expect(b!.height).toBeGreaterThanOrEqual(a!.height);
    const tools = await page.locator('.field-tools').boundingBox();
    const pad = await page.getByRole('slider', { name: /流场圆盘/ }).boundingBox();
    const presets = await page.locator('.field-presets').boundingBox();
    expect(tools!.y + tools!.height).toBeLessThanOrEqual(pad!.y);
    expect(pad!.y + pad!.height).toBeLessThanOrEqual(presets!.y);
    if (size.width <= 1100) {
      const rail = await page.locator('.lab-rail').boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(rail!.y + rail!.height);
    }
    await page.getByRole('button', { name: '极光', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: '极光', exact: true })).toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: '极光', exact: true }).click(); await fieldReady(page);
    await page.getByRole('button', { name: '重置粒子', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('slider', { name: /流场圆盘/ })).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: testInfo.outputPath(`display-board-${size.width}-${size.height}.png`) });
  }
  expect((await snapshot(page)).generation).toBe(initial.generation);
});


test('building surface pointer input reaches the shared field and inactive modules stop its clock', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.goto('/lab?mode=particles'); await fieldReady(page);
  await page.getByRole('button', { name: '漂流', exact: true }).click(); await fieldReady(page);
  for (const module of ['photo', 'lightform']) {
    await page.locator(`[data-module=${module}]`).click();
    await expect(page.locator(module === 'photo' ? '.photo-studio' : '.lightform-studio:not(.photo-studio)')).toBeVisible();
    await sceneReady(page);
    if (module === 'photo') {
      await page.getByRole('button', { name: '显示素材面板', exact: true }).click();
      await page.getByRole('button', { name: /^使用粒子流场实时画面/ }).click();
    } else {
      await openPreview(page);
      await page.getByRole('button', { name: '粒子交互', exact: true }).click();
    }
    await fieldReady(page);
    await page.getByRole('button', { name: '隐藏粒子流场预览', exact: true }).click();
    const canvas = page.locator('.canvas-host canvas');
    // Use normalized viewport coordinates; the tower intersects the center
    // section in both calibrated photo and default 3D cameras.
    const rect = (await canvas.boundingBox())!;
    const samples = module === 'photo' ? [[.61,.55],[.64,.5]] : [.25,.35,.45,.55,.65,.75,.85].flatMap(y => [.25,.35,.45,.55,.65,.75].map(x => [x,y]));
    let hit = false;
    for (const [x,y] of samples) {
      await page.mouse.move(rect.x + rect.width*x, rect.y + rect.height*y);
      if (await page.locator('.canvas-host').getAttribute('data-pointer-uv')) { hit = true; break; }
    }
    expect(hit, `${module} display hit at ${JSON.stringify(rect)}`).toBe(true);
    await page.mouse.down();
    const pointer = await page.locator('.field-art').evaluate(node =>
      (node as HTMLElement & { fieldStudy: { snapshot: () => { pointer: { down: boolean } } } }).fieldStudy.snapshot().pointer);
    expect(pointer.down).toBe(true);
    await page.mouse.up();
    const frame = (await snapshot(page)).frames;
    await expect.poll(async () => (await snapshot(page)).frames).toBeGreaterThan(frame);
  }
  // Observe the same source object while the controls are unmounted.
  await page.evaluate(() => {
    const study = (document.querySelector('.field-art') as HTMLElement & { fieldStudy: { snapshot: () => Diagnostics } }).fieldStudy;
    (window as Window & { suspendedField?: typeof study }).suspendedField = study;
  });
  await page.locator('[data-module=day]').click();
  const readSuspended = () => page.evaluate(() => (window as Window & { suspendedField: { snapshot: () => Diagnostics } }).suspendedField.snapshot());
  await expect.poll(async () => (await readSuspended()).loopCount).toBe(0);
  const time = (await readSuspended()).time;
  await page.waitForTimeout(150); expect((await readSuspended()).time).toBe(time);
  await page.locator('[data-module=particles]').click(); await fieldReady(page);
  await expect.poll(async () => (await snapshot(page)).time).toBeGreaterThan(time);
  await page.getByRole('link', { name: 'TJAD 建筑照明所首页', exact: true }).click();
  await expect.poll(async () => (await readSuspended()).instance).toBe(-1);
  expect(await readSuspended()).toMatchObject({ loopCount: 0, bridgeCount: 0 });
});
