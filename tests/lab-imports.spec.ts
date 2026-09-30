import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const image = readFileSync('public/assets/light-lab/chroma/demo-portrait-v2.png');

test('Chroma Field loads, responds, exports, translates, and keeps its artwork across modes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/lab?mode=chroma');
  await expect(page.locator('.lab-workbench')).toHaveAttribute('data-mode', 'chroma');
  await expect(page.locator('.lab-rail-item')).toHaveCount(5);
  await expect(page.locator('.chroma-field .particle-canvas')).toBeVisible();
  await expect(page.locator('.chroma-field .current-image img')).toHaveAttribute('alt', 'Studio portrait');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  await page.locator('.chroma-field input[type="file"][accept="image/jpeg,image/png,image/webp"]').setInputFiles({ name: 'custom.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.chroma-field .current-image img')).toHaveAttribute('alt', 'custom.png');
  await page.getByRole('slider', { name: '密度' }).focus();
  await page.getByRole('slider', { name: '密度' }).press('ArrowRight');
  await expect(page.locator('.chroma-field .control-row').filter({ hasText: '密度' })).toContainText('0.73');
  const download = page.waitForEvent('download');
  await page.locator('.chroma-field .export-button').click();
  expect((await download).suggestedFilename()).toMatch(/chroma-field-custom\.png/);

  await page.getByRole('button', { name: '切换为英文' }).first().click();
  await expect(page.locator('.chroma-field .upload-button')).toContainText('Upload Image');
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.locator('.lightform-studio')).toBeVisible();
  await page.locator('.lab-rail-item[data-module="chroma"]').click();
  await expect(page.locator('.chroma-field .current-image img')).toHaveAttribute('alt', 'custom.png');
  await expect(page.locator('.chroma-field .control-row').filter({ hasText: 'Density' })).toContainText('0.73');
  expect(errors).toEqual([]);
});

test('Lightform Studio switches scenes, uploads, exports, translates, and resets', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/lab?mode=lightform');
  await expect(page.locator('.lab-workbench')).toHaveAttribute('data-mode', 'lightform');
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  await expect(page.locator('.lightform-studio .canvas-host canvas')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole('button', { name: '显示参数面板' }).click();
  await expect(page.getByRole('slider', { name: '灯带亮度' })).toHaveValue('58');
  await page.getByRole('tab', { name: '888 Collins' }).click();
  await expect(page.getByRole('tab', { name: '888 Collins' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('slider', { name: '灯带亮度' })).toHaveValue('58');
  await expect(page.getByRole('slider', { name: '灯带间隙' })).toHaveValue('42');
  const stripCanvas = page.locator('.lightform-studio .canvas-host canvas');
  await page.getByRole('slider', { name: '灯带间隙' }).fill('0');
  await page.waitForTimeout(150);
  const closedGap = await stripCanvas.evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
  await page.getByRole('slider', { name: '灯带间隙' }).fill('90');
  await page.waitForTimeout(150);
  expect(await stripCanvas.evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL())).not.toBe(closedGap);
  await page.getByRole('button', { name: '恢复默认显示' }).click();
  await expect(page.getByRole('slider', { name: '灯带间隙' })).toHaveValue('42');
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await expect(page.locator('.lightform-studio .dropzone')).toBeEnabled();
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'facade.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('facade.png');
  await page.getByRole('slider', { name: '灯带亮度' }).fill('70');
  await expect(page.locator('.lightform-studio .slider-row').filter({ hasText: '灯带亮度' })).toContainText('70%');
  const download = page.waitForEvent('download');
  await page.locator('.lightform-studio .export-button').click();
  expect((await download).suggestedFilename()).toMatch(/collins-studio-.*\.png/);

  await page.getByRole('button', { name: '切换为英文' }).first().click();
  await expect(page.locator('.lightform-studio .export-button')).toContainText('Export image');
  await expect(page.getByRole('slider', { name: 'Strip gap' })).toBeVisible();
  await page.locator('.lab-rail-item[data-module="chroma"]').click();
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.getByRole('tab', { name: '888 Collins' })).toHaveAttribute('aria-selected', 'true');
  expect(errors).toEqual([]);
});

test('Lightform uploaded media keeps the correct top and bottom across all three scenes', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const svg = '<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">'
    + '<path fill="red" d="M0 0h512v256H0z"/><path fill="blue" d="M0 256h512v256H0z"/></svg>';
  const orientationImage = await sharp(Buffer.from(svg)).png().toBuffer();
  await page.goto('/lab?mode=lightform');
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'orientation.png', mimeType: 'image/png', buffer: orientationImage });
  await page.getByRole('button', { name: '隐藏素材面板' }).click();
  for (const [name, label] of [['collins', '888 Collins'], ['facade', '弧形点阵展馆'], ['sphere', '球形展馆']] as const) {
    const tab = page.getByRole('tab', { name: label });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(tab).toBeEnabled();
    await expect(page.locator('.lightform-studio .scene-switch-mask')).not.toHaveClass(/active/);
    await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('orientation.png');
    await expect.poll(async () => {
      const { data, info } = await sharp(await page.locator('.lightform-studio .canvas-host').screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let redCount = 0, blueCount = 0, redY = 0, blueY = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        const pixel = (y * info.width + x) * 3;
        const [red, green, blue] = data.subarray(pixel, pixel + 3);
        // Ignore warm streetlights and their ground reflections; only the
        // saturated test image identifies the media's vertical orientation.
        if (red > 100 && red > green + 60 && red > blue + 60) { redCount++; redY += y; }
        if (blue > 100 && blue > red + 60 && blue > green + 60) { blueCount++; blueY += y; }
      }
      return {
        ready: redCount > 100 && blueCount > 100 && redY / redCount + 10 < blueY / blueCount,
        redCount, blueCount,
        redY: Math.round(redY / redCount), blueY: Math.round(blueY / blueCount),
      };
    }, { message: `${name}: uploaded red must render above blue`, timeout: 15_000 }).toMatchObject({ ready: true });
  }
});

test('sphere shows the complete uploaded image above the plaza', async ({ page }) => {
  const bands = await sharp(Buffer.from('<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">'
    + '<path fill="#ff0000" d="M0 0h600v200H0z"/><path fill="#00ff00" d="M0 200h600v200H0z"/>'
    + '<path fill="#0000ff" d="M0 400h600v200H0z"/></svg>')).png().toBuffer();
  await page.goto('/lab?mode=lightform');
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'full-height.png', mimeType: 'image/png', buffer: bands });
  await page.getByRole('button', { name: '隐藏素材面板' }).click();
  await page.getByRole('tab', { name: '球形展馆' }).click();
  await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
  await expect.poll(async () => {
    const { data, info } = await sharp(await page.locator('.canvas-host').screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const counts = [0, 0, 0], heights = [0, 0, 0];
    for (let y = Math.floor(info.height * .2); y < info.height * .82; y++) {
      for (let x = Math.floor(info.width * .3); x < info.width * .7; x++) {
        const [r, g, b] = data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3);
        const index = r > 100 && r > g + 60 && r > b + 60 ? 0
          : g > 100 && g > r + 60 && g > b + 60 ? 1
            : b > 100 && b > r + 60 && b > g + 60 ? 2 : -1;
        if (index >= 0) { counts[index]++; heights[index] += y; }
      }
    }
    const means = heights.map((sum, index) => sum / counts[index]);
    return { complete: counts.every(count => count > 1000) && means[0] + 20 < means[1] && means[1] + 20 < means[2], counts, means };
  }, { message: 'All three image bands must be visible, ordered top to bottom above ground', timeout: 15_000 }).toMatchObject({ complete: true });
});

test('sphere media longitude seam stays behind the default camera', async ({ page }) => {
  // Deliberately different image edges make a front-facing wrap seam obvious.
  const longitudeImage = await sharp(Buffer.from('<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">'
    + '<path fill="#ff0000" d="M0 0h180v600H0z"/><path fill="#00ff00" d="M180 0h240v600H180z"/>'
    + '<path fill="#0000ff" d="M420 0h180v600H420z"/></svg>')).png().toBuffer();
  await page.goto('/lab?mode=lightform');
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'longitude.png', mimeType: 'image/png', buffer: longitudeImage });
  await page.getByRole('button', { name: '隐藏素材面板' }).click();
  await page.getByRole('tab', { name: '球形展馆' }).click();
  await expect(page.locator('.scene-switch-mask')).not.toHaveClass(/active/);
  await expect.poll(async () => {
    const { data, info } = await sharp(await page.locator('.canvas-host').screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let green = 0, edges = 0;
    for (let y = Math.floor(info.height * .4); y < info.height * .6; y++) {
      for (let x = Math.floor(info.width * .47); x < info.width * .53; x++) {
        const [r, g, b] = data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3);
        if (g > 80 && g > r + 40 && g > b + 40) green++;
        if ((r > 80 && r > g + 40 && r > b + 40) || (b > 80 && b > r + 40 && b > g + 40)) edges++;
      }
    }
    return { continuous: green > 1000 && edges < green * .01, green, edges };
  }, { message: 'Default front view must show the image center, not its red/blue wrap seam', timeout: 15_000 }).toMatchObject({ continuous: true });
});

test('Chroma Field releases microphone input when leaving the mode', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        ...original,
        getUserMedia: async () => {
          const context = new AudioContext();
          const stream = context.createMediaStreamDestination().stream;
          Object.assign(window, { testMicStream: stream, testMicContext: context });
          return stream;
        },
      },
    });
  });
  await page.goto('/lab?mode=chroma');
  await expect(page.locator('.chroma-field .current-image')).toBeVisible();
  const wav = Buffer.alloc(44 + 8000 * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(16000, 40);
  await page.locator('.chroma-field input[type="file"][accept="audio/*"]').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: wav });
  await expect(page.locator('.chroma-field .audio-file-row')).toContainText('tone.wav');
  await page.getByRole('button', { name: '麦克风' }).click();
  await expect(page.locator('.chroma-field .mic-status')).toBeVisible();
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.locator('.chroma-field')).toHaveCount(0);
  expect(await page.evaluate(() => {
    const stream = (window as Window & { testMicStream?: MediaStream }).testMicStream;
    return stream?.getTracks().every(track => track.readyState === 'ended');
  })).toBe(true);
});

test('Lightform Studio accepts a local video and keeps it across its scenes', async ({ page }) => {
  await page.goto('/lab?mode=lightform');
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d')!;
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const done = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
    recorder.start();
    for (let frame = 0; frame < 8; frame++) {
      context.fillStyle = frame % 2 ? '#2468ff' : '#f5a833';
      context.fillRect(0, 0, 64, 64);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    recorder.stop();
    await done;
    stream.getTracks().forEach(track => track.stop());
    const file = new File(chunks, 'motion.webm', { type: 'video/webm' });
    const input = document.querySelector<HTMLInputElement>('.lightform-studio input[type="file"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('motion.webm');
  await page.getByRole('button', { name: '暂停视频' }).click();
  await page.waitForTimeout(250);
  const pausedAt = Number(await page.getByRole('slider', { name: '视频进度' }).inputValue());
  await page.getByRole('tab', { name: '888 Collins' }).click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('motion.webm');
  expect(Number(await page.getByRole('slider', { name: '视频进度' }).inputValue())).toBeCloseTo(pausedAt, 1);
  await page.getByRole('tab', { name: '弧形点阵展馆' }).click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('motion.webm');
  expect(Number(await page.getByRole('slider', { name: '视频进度' }).inputValue())).toBeCloseTo(pausedAt, 1);
  await page.getByRole('tab', { name: '球形展馆' }).click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('motion.webm');
  await page.getByRole('button', { name: '恢复三个场景的演示素材' }).click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('球形展馆地球夜景');
  await page.getByRole('tab', { name: '888 Collins' }).click();
  await expect(page.locator('.lightform-studio .media-meta')).toContainText('BUILT-IN PREVIEW');
  await page.getByRole('tab', { name: '弧形点阵展馆' }).click();
  await expect(page.locator('.lightform-studio .media-meta')).toContainText('BUILT-IN PREVIEW');
  await page.locator('.lab-rail-item[data-module="chroma"]').click();
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('街区塔楼灯带演示');
});

test('Lightform keeps one uploaded asset across scenes and releases it on replacement', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const created: string[] = [];
    const revoked: string[] = [];
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      const url = create(object);
      if (object instanceof File && /^(shared|replacement|exit)\.png$/.test(object.name)) created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => { if (created.includes(url)) revoked.push(url); revoke(url); };
    Object.assign(window, { lightformUrls: { created, revoked } });
  });
  await page.goto('/lab?mode=lightform');
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  const stage = page.locator('.lightform-studio .canvas-host');
  await expect(stage).toHaveAttribute('data-tree-count', /\d+/, { timeout: 20_000 });
  const collinsTrees = Number(await stage.getAttribute('data-tree-triangles'));
  expect(collinsTrees).toBeGreaterThan(0);
  expect(collinsTrees + 72_604).toBeLessThan(1_500_000);
  await stage.screenshot({ path: testInfo.outputPath('collins-eye-level.png') });
  for (const [scene, fileName] of [['弧形点阵展馆', 'facade-eye-level.png'], ['球形展馆', 'dome-eye-level.png']] as const) {
    const tab = page.getByRole('tab', { name: scene });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(tab).toBeEnabled();
    await expect(page.locator('.lightform-studio .scene-switch-mask')).not.toHaveClass(/active/);
    await page.waitForTimeout(300);
    const treeTriangles = Number(await stage.getAttribute('data-tree-triangles'));
    if (scene === '球形展馆') {
      expect(treeTriangles).toBeGreaterThan(0);
      expect(treeTriangles + 60_062).toBeLessThan(1_500_000);
    } else {
      expect(treeTriangles).toBeGreaterThan(0);
      expect(treeTriangles + 1_110_045).toBeLessThan(1_500_000);
    }
    await stage.screenshot({ path: testInfo.outputPath(fileName) });
  }
  await page.getByRole('button', { name: '显示参数面板' }).click();
  await page.getByRole('button', { name: '俯视' }).click();
  await page.getByRole('button', { name: '重置视角' }).click();
  await page.getByRole('button', { name: '隐藏参数面板' }).click();
  await stage.screenshot({ path: testInfo.outputPath('dome-reset-eye-level.png') });
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'shared.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('shared.png');
  await page.getByRole('tab', { name: '888 Collins' }).click();
  await expect(page.getByRole('tab', { name: '888 Collins' })).toBeEnabled();
  await page.getByRole('tab', { name: '球形展馆' }).click();
  await expect(page.getByRole('tab', { name: '球形展馆' })).toBeEnabled();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('shared.png');
  expect(await page.evaluate(() => (window as Window & { lightformUrls: { created: string[]; revoked: string[] } }).lightformUrls.revoked.length)).toBe(0);
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('replacement.png');
  expect(await page.evaluate(() => (window as Window & { lightformUrls: { created: string[]; revoked: string[] } }).lightformUrls.revoked.length)).toBe(1);
  await page.getByRole('button', { name: '恢复三个场景的演示素材' }).click();
  expect(await page.evaluate(() => {
    const { created, revoked } = (window as Window & { lightformUrls: { created: string[]; revoked: string[] } }).lightformUrls;
    return created.length === 2 && revoked.length === 2 && created.every(url => revoked.includes(url));
  })).toBe(true);
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'exit.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('exit.png');
  await page.locator('.lab-rail-item[data-module="chroma"]').click();
  await expect(page.locator('.lab-workbench')).toHaveAttribute('data-mode', 'chroma');
  await expect(page.locator('.lightform-studio')).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { lightformUrls: { revoked: string[] } }).lightformUrls.revoked.length)).toBe(2);
  await page.locator('.lab-rail-item[data-module="photo"]').click();
  await expect(page.locator('.photo-studio .media-meta strong')).toHaveText('exit.png');
  await page.getByRole('link', { name: '专业与团队', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => {
    const { created, revoked } = (window as Window & { lightformUrls: { created: string[]; revoked: string[] } }).lightformUrls;
    return created.length === 3 && revoked.length === 3 && created.every(url => revoked.includes(url));
  })).toBe(true);
});

test('new modes show a usable WebGL fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      if (args[0] === 'webgl' || args[0] === 'webgl2' || args[0] === 'experimental-webgl') return null;
      return getContext.apply(this, args);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/lab?mode=chroma');
  await expect(page.locator('.chroma-field .error-toast')).toContainText('无法使用 WebGL');
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.locator('.lightform-studio .scene-loading')).toContainText('无法启动 WebGL');
});

test('Chroma Live maps to all three scenes and the facade LED texture remains independent', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/lab?mode=chroma');
  await expect(page.locator('.chroma-field .current-image')).toBeVisible();
  await page.locator('.chroma-field input[type="file"][accept="image/jpeg,image/png,image/webp"]').setInputFiles({ name: 'live-art.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.chroma-field .current-image img')).toHaveAttribute('alt', 'live-art.png');
  await page.getByRole('slider', { name: '密度' }).fill('0.85');
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'sphere-before-live.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('sphere-before-live.png');
  await page.getByRole('button', { name: /使用 Chroma 实时画面/ }).click();
  await expect(page.locator('.lightform-studio .media-meta')).toContainText('CHROMA LIVE');
  const preview = page.locator('.lightform-studio .live-preview-canvas canvas');
  await expect(preview).toBeVisible();
  await preview.evaluate(canvas => { canvas.dataset.liveInstance = 'original'; });
  const liveFrame = () => preview.evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
  const firstFrame = await liveFrame();
  await page.waitForTimeout(250);
  expect(await liveFrame()).not.toBe(firstFrame);
  await preview.hover({ position: { x: 70, y: 60 } });
  await page.mouse.down();
  const previewBox = (await preview.boundingBox())!;
  await page.mouse.move(previewBox.x + 150, previewBox.y + 120, { steps: 5 });
  await page.mouse.up();
  await preview.click({ button: 'right', position: { x: 100, y: 80 } });
  await page.locator('.lightform-studio .live-preview-toggle').click();
  await expect(page.locator('.lightform-studio .live-preview')).toHaveClass(/collapsed/);
  const hiddenFrame = await liveFrame();
  await page.waitForTimeout(250);
  expect(await liveFrame()).not.toBe(hiddenFrame);
  const download = page.waitForEvent('download');
  await page.locator('.lightform-studio .export-button').click();
  expect((await download).suggestedFilename()).toMatch(/collins-studio-.*\.png/);

  for (const tabName of ['球形展馆', '弧形点阵展馆']) {
    await page.getByRole('tab', { name: tabName }).click();
    await expect(page.getByRole('tab', { name: tabName })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.lightform-studio .media-meta')).toContainText('CHROMA LIVE');
    await expect(preview).toHaveAttribute('data-live-instance', 'original');
    await page.getByRole('button', { name: '显示素材面板' }).click();
    expect(await page.locator('.lightform-studio .canvas-host canvas').count()).toBe(1);
    await page.getByRole('button', { name: '隐藏素材面板' }).click();
  }
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await page.getByRole('button', { name: /切回原素材/ }).first().click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('sphere-before-live.png');
  await page.locator('.lightform-studio input[type="file"]').setInputFiles({ name: 'static.png', mimeType: 'image/png', buffer: image });
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('static.png');
  await page.getByRole('tab', { name: '球形展馆' }).click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('static.png');
  await page.getByRole('tab', { name: '弧形点阵展馆' }).click();
  await page.getByRole('button', { name: '显示参数面板' }).click();
  const dotSize = page.getByRole('slider', { name: '光点大小' });
  const ledTexture = page.getByRole('slider', { name: '灯珠颗粒感' });
  await expect(dotSize).toHaveValue('55');
  await ledTexture.fill('0');
  await expect(page.locator('.lightform-studio .pixel-readout')).toContainText('平滑画面');
  await page.waitForTimeout(200);
  const smoothFrame = await page.locator('.lightform-studio .canvas-host canvas').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
  await ledTexture.fill('100');
  await expect(page.locator('.lightform-studio .pixel-readout')).toContainText('明显灯珠与暗缝');
  await expect(dotSize).toHaveValue('55');
  await page.waitForTimeout(200);
  const ledFrame = await page.locator('.lightform-studio .canvas-host canvas').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
  expect(ledFrame).not.toBe(smoothFrame);
  await page.getByRole('tab', { name: '球形展馆' }).click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('static.png');
  await page.getByRole('button', { name: /使用 Chroma 实时画面/ }).click();
  await expect(page.locator('.lightform-studio .media-meta')).toContainText('CHROMA LIVE');
  await page.getByRole('button', { name: '切换为英文' }).first().click();
  await expect(page.locator('.lightform-studio .live-preview-toggle')).toContainText('Chroma Live');
  await expect(page.getByRole('slider', { name: 'LED texture' })).toBeVisible();
  await page.getByRole('button', { name: 'Show media panel' }).click();
  await page.getByRole('button', { name: 'Return to previous media' }).first().click();
  await expect(page.locator('.lightform-studio .media-meta strong')).toHaveText('static.png');
  expect(errors).toEqual([]);
});

test('Chroma Live keeps the previous media when its WebGL preview cannot start', async ({ page }) => {
  await page.goto('/lab?mode=chroma');
  await expect(page.locator('.chroma-field .current-image')).toBeVisible();
  await page.locator('.lab-rail-item[data-module="lightform"]').click();
  await expect(page.locator('.lightform-studio .scene-loading')).toBeHidden({ timeout: 20_000 });
  await page.evaluate(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      if (args[0] === 'webgl' || args[0] === 'webgl2' || args[0] === 'experimental-webgl') return null;
      return getContext.apply(this, args);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.getByRole('button', { name: '显示素材面板' }).click();
  await page.getByRole('button', { name: /使用 Chroma 实时画面/ }).click();
  await expect(page.locator('.lightform-studio .error-banner')).toContainText('无法启动 Chroma 实时画面');
  await expect(page.locator('.lightform-studio .media-meta')).toContainText('街区塔楼灯带演示');
  await expect(page.locator('.lightform-studio .live-preview')).toHaveCount(0);
});
