import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

const scenes = [['dome', '城市穹顶'], ['fluid', '流线灯幕'], ['field', '光柱广场']] as const;
async function select(page: Page, id: string, name: string) {
  await page.getByRole('tab', { name, exact: true }).click();
  await expect(page.locator('.lightform-studio .canvas-host')).toHaveAttribute('data-scene', id);
  await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
  await expect(page.locator('.scene-switch-mask')).toHaveCSS('opacity', '0');
}
async function ready(page: Page) { await expect(page.locator('.lightform-studio')).toBeVisible(); await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 30_000 }); await expect(page.locator('.scene-tabs [role=tab]').first()).toBeEnabled(); }

test('three native scenes are lazy, have bounded draws, and keep photo scenes separate', async ({ page }) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => requests.push(r.url()));
  await page.goto('/lab?mode=lightform'); await ready(page);
  await expect(page.getByRole('tab', { name: '城市穹顶', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.scene-tabs [role=tab]')).toHaveCount(3);
  await expect(page.getByRole('tab', { name: '点阵立面', exact: true })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: '六边形灯幕', exact: true })).toHaveCount(0);
  for (const [id, name] of scenes) {
    await select(page, id, name);
    await expect(page.locator('.canvas-host')).toHaveAttribute('data-display-count', id === 'field' ? '42' : '1');
    await expect.poll(async () => Number(await page.locator('.canvas-host').getAttribute('data-draw-calls'))).toBeLessThan(400);
    await expect(page.locator('.error-banner')).toHaveCount(0);
  }
  expect(requests.some(url => /\.glb(?:\?|$)|night-city\.hdr/.test(url))).toBe(false);
  await page.locator('[data-module=photo]').click(); await ready(page);
  await expect(page.locator('.scene-tabs [role=tab]')).toHaveText(['888 Collins', '弧形点阵展馆', '球形展馆']);
  expect(errors).toEqual([]);
});

test('landscape, portrait and square orientation stays complete across the dome and the full fluid curtain', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/lab?mode=lightform'); await ready(page);
  for (const [width, height] of [[900, 600], [420, 700], [600, 600]]) {
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`
      + `<path fill="red" d="M0 0h${width}v${height / 3}H0z"/><path fill="#00ff00" d="M0 ${height / 3}h${width}v${height / 3}H0z"/>`
      + `<path fill="blue" d="M0 ${height * 2 / 3}h${width}v${height / 3}H0z"/></svg>`;
    await page.locator('.lightform-studio input[type=file]').setInputFiles({ name: 'orientation.png', mimeType: 'image/png', buffer: await sharp(Buffer.from(svg)).png().toBuffer() });
    await page.getByRole('button', { name: '隐藏素材面板', exact: true }).click();
    for (const [id, name] of scenes.filter(([id]) => id !== 'field')) {
      await select(page, id, name);
      const stage = page.locator('.canvas-host');
      await expect.poll(async () => {
        const { data, info } = await sharp(await stage.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const counts = [0, 0, 0], sums = [0, 0, 0];
        // Architectural orientation excludes ground reflections. Field color visibility includes low columns.
        for (let y = 0; y < info.height * .66; y++) for (let x = 0; x < info.width; x++) {
          const [r, g, b] = data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3);
          // Pure primary colors identify media, excluding the native warm lobby and console.
          const index = r > 90 && g < 50 && b < 50 ? 0 : g > 90 && r < 50 && b < 50 ? 1 : b > 90 && r < 50 && g < 50 ? 2 : -1;
          if (index >= 0) { counts[index]++; sums[index] += y; }
        }
        const means = sums.map((sum, i) => sum / counts[i]);
        return { counts, means, visible: counts.every(count => count > 30), oriented: means[0] + 5 < means[1] && means[1] + 5 < means[2] };
      }, { message: `${id}: ${width}x${height} complete RGB bands`, timeout: 10_000 }).toMatchObject({ visible: true, oriented: true });
    }
  }
});

test('particle hit coordinates agree with display letterboxes and field ground coordinates', async ({ page }) => {
  await page.goto('/lab?mode=lightform'); await ready(page);
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await page.getByRole('button', { name: '使用粒子流场实时画面' }).click();
  const hideMedia = page.getByRole('button', { name: '隐藏素材面板' });
  if (await hideMedia.count()) await hideMedia.click();
  await page.getByRole('button', { name: '粒子交互', exact: true }).click();
  for (const [id, name] of scenes.filter(([id]) => id !== 'field')) {
    await select(page, id, name);
    const host = page.locator('.canvas-host'), box = (await host.boundingBox())!;
    let point: string | null = null;
    // Find a visible interactive patch without depending on a single camera pixel.
    for (const y of [.32, .4, .48, .56, .64, .72]) {
      for (const x of [.35, .45, .5, .55, .6, .65]) {
        await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
        point = await host.getAttribute('data-pointer-uv'); if (point) break;
      }
      if (point) break;
    }
    expect(point, `${id} has an interactive media patch`).not.toBeNull();
    const [u, v] = point!.split(',').map(Number);
    expect(u).toBeGreaterThanOrEqual(0); expect(u).toBeLessThanOrEqual(1);
    expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1);
    await page.mouse.move(box.x + 3, box.y + 3);
    await expect(host).not.toHaveAttribute('data-pointer-uv');
  }
});

test('failed textures show retry and a fresh renderer recovers', async ({ page }) => {
  await page.route('**/night/dome-materials/roof_albedo.png', route => route.abort());
  await page.goto('/lab?mode=lightform');
  await expect(page.locator('.scene-loading')).toContainText('Material texture failed');
  await page.unroute('**/night/dome-materials/roof_albedo.png');
  await page.getByRole('button', { name: '重试', exact: true }).click(); await ready(page);
  await select(page, 'fluid', '流线灯幕');
});

test('the rear dome mirrors the front media instead of showing an empty hemisphere', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/lab?mode=lightform'); await ready(page);
  const bands = await sharp(Buffer.from('<svg width="900" height="450" xmlns="http://www.w3.org/2000/svg"><path fill="red" d="M0 0h300v450H0z"/><path fill="#00ff00" d="M300 0h300v450H300z"/><path fill="blue" d="M600 0h300v450H600z"/></svg>')).png().toBuffer();
  await page.locator('.lightform-studio input[type=file]').setInputFiles({ name: 'mirror.png', mimeType: 'image/png', buffer: bands });
  await page.getByRole('button', { name: '隐藏素材面板', exact: true }).click();
  const stage = page.locator('.canvas-host');
  async function colors() {
    const { data, info } = await sharp(await stage.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const counts = [0, 0], xs = [0, 0];
    for (let y = info.height * .2 | 0; y < info.height * .57; y++) for (let x = 0; x < info.width; x++) {
      const [r, g, b] = data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3);
      const i = r > 90 && g < 50 && b < 50 ? 0 : b > 90 && r < 50 && g < 50 ? 1 : -1;
      if (i >= 0) { counts[i]++; xs[i] += x; }
    }
    return { red: xs[0] / counts[0], blue: xs[1] / counts[1], visible: counts.every(n => n > 300) };
  }
  await expect.poll(async () => { const c = await colors(); return c.visible && c.red + 50 < c.blue; }).toBe(true);
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * .27, box.y + box.height * .73);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .27 + box.height / 2, box.y + box.height * .73, { steps: 30 });
  await page.mouse.up();
  await expect.poll(async () => { const c = await colors(); return c.visible && c.red > c.blue + 50; }).toBe(true);
});

test('the plaza ignores uploaded media and particles, and owns its warm-white upward breathing cycle', async ({ page }) => {
  test.setTimeout(45_000);
  await page.goto('/lab?mode=lightform'); await ready(page);
  const magenta = await sharp({ create: { width: 320, height: 180, channels: 3, background: '#ff00ff' } }).png().toBuffer();
  await page.locator('.lightform-studio input[type=file]').setInputFiles({ name: 'shared-magenta.png', mimeType: 'image/png', buffer: magenta });
  await page.getByRole('button', { name: '隐藏素材面板', exact: true }).click();
  await select(page, 'field', '光柱广场');
  const stage = page.locator('.canvas-host');
  await expect(stage).toHaveAttribute('data-source', 'autonomous');
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await expect(page.locator('.media-meta strong')).toHaveText('暖白呼吸灯 · 循环');
  await expect(page.locator('.live-preview')).toHaveCount(0);
  expect(Number(await stage.getAttribute('data-column-fill'))).toBeLessThan(.1);
  await expect.poll(async () => Number(await stage.getAttribute('data-column-fill')), { timeout: 7000 }).toBeGreaterThan(.98);
  const { data, info } = await sharp(await stage.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let warm = 0, purple = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const [r, g, b] = data.subarray(i, i + 3);
    if (r > 180 && g > 140 && b > 90 && r > b + 15) warm++;
    if (r > 120 && b > 120 && g < 50) purple++;
  }
  expect(warm).toBeGreaterThan(200); expect(purple).toBeLessThan(20);
  await expect.poll(async () => Number(await stage.getAttribute('data-column-breath')), { timeout: 4000 }).toBeLessThan(.1);
  await expect.poll(async () => Number(await stage.getAttribute('data-column-fill')), { timeout: 3000 }).toBeLessThan(.05);
  await select(page, 'dome', '城市穹顶');
  await expect(page.locator('.media-meta strong')).toHaveText('shared-magenta.png');
  await page.getByRole('button', { name: '显示素材面板', exact: true }).click();
  await page.getByRole('button', { name: '使用粒子流场实时画面' }).click();
  await select(page, 'field', '光柱广场');
  await expect(stage).toHaveAttribute('data-source', 'autonomous');
  await expect(page.locator('.live-preview')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '粒子交互', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '显示参数面板', exact: true }).click();
  await expect(page.getByRole('slider', { name: '画面水平位置', exact: true })).toHaveCount(0);
  await select(page, 'dome', '城市穹顶');
  await expect(stage).toHaveAttribute('data-source', 'particles');
});

test('Fluid Live keeps one WebGPU source and maps it into both architectural scenes', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/lab?mode=lightform'); await ready(page);
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await page.getByRole('button', { name: '使用 Fluid 实时画面' }).click();
  await expect(page.locator('.canvas-host')).toHaveAttribute('data-source', 'fluid', { timeout: 20_000 });
  const source = page.locator('.fluid-live-canvas'); await source.evaluate(canvas => { canvas.dataset.instance = 'original'; });
  await page.getByRole('button', { name: '隐藏 Fluid 预览', exact: true }).click();
  for (const [id, name] of scenes.filter(([id]) => id !== 'field')) {
    await select(page, id, name);
    await expect(page.locator('.canvas-host')).toHaveAttribute('data-source', 'fluid');
    await expect(source).toHaveAttribute('data-instance', 'original');
    await expect(page.locator('.media-meta')).toContainText('FLUID LIVE');
    await expect(page.locator('.error-banner')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('leaving the three cached scenes releases the renderer GPU textures and buffers', async ({ page }) => {
  await page.addInitScript(() => {
    type Record = { gl: WebGL2RenderingContext; canvas: HTMLCanvasElement; textures: Set<WebGLTexture>; buffers: Set<WebGLBuffer> };
    const records = new Map<WebGL2RenderingContext, Record>();
    const prototype = WebGL2RenderingContext.prototype;
    const entry = (gl: WebGL2RenderingContext) => {
      if (!records.has(gl)) records.set(gl, { gl, canvas: gl.canvas as HTMLCanvasElement, textures: new Set(), buffers: new Set() });
      return records.get(gl)!;
    };
    const createTexture = prototype.createTexture, deleteTexture = prototype.deleteTexture;
    prototype.createTexture = function () { const value = createTexture.call(this); if (value) entry(this).textures.add(value); return value; };
    prototype.deleteTexture = function (value) { if (value) entry(this).textures.delete(value); deleteTexture.call(this, value); };
    const createBuffer = prototype.createBuffer, deleteBuffer = prototype.deleteBuffer;
    prototype.createBuffer = function () { const value = createBuffer.call(this); if (value) entry(this).buffers.add(value); return value; };
    prototype.deleteBuffer = function (value) { if (value) entry(this).buffers.delete(value); deleteBuffer.call(this, value); };
    Object.assign(window, { nightGpuRecords: records });
  });
  await page.goto('/lab?mode=lightform'); await ready(page);
  for (const [id, name] of scenes) await select(page, id, name);
  await page.evaluate(() => {
    const records = (window as unknown as { nightGpuRecords: Map<unknown, { canvas: HTMLCanvasElement; textures: Set<unknown>; buffers: Set<unknown> }> }).nightGpuRecords;
    const original = [...records.values()].find(record => record.canvas === document.querySelector('.canvas-host canvas'))!;
    Object.assign(window, { originalNightGpu: original });
  });
  await page.locator('[data-module=day]').click();
  await expect.poll(() => page.evaluate(() => {
    const original = (window as unknown as { originalNightGpu: { gl: WebGL2RenderingContext; textures: Set<WebGLTexture>; buffers: Set<WebGLBuffer> } }).originalNightGpu;
    // Context-owned fallback textures do not get individual deleteTexture calls.
    return { textures: [...original.textures].filter(t => original.gl.isTexture(t)).length,
      buffers: [...original.buffers].filter(b => original.gl.isBuffer(b)).length };
  })).toEqual({ textures: 0, buffers: 0 });
  await page.locator('[data-module=lightform]').click(); await ready(page);
  await select(page, 'fluid', '流线灯幕');
});
