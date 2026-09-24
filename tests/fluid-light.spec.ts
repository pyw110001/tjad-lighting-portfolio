import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test('WebGPU fluid light renders particles without GPU validation errors', async ({ page }) => {
  const gpuErrors: string[] = [];
  page.on('console', message => {
    if (/WebGPU Uncaptured Error|Invalid BindGroup|Invalid CommandBuffer/.test(message.text())) {
      gpuErrors.push(message.text());
    }
  });

  await page.goto('/lab?mode=wave');
  await page.locator('#lab-wave').scrollIntoViewIfNeeded();

  const adapterAvailable = await page.evaluate(async () =>
    Boolean(await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' }))
  );
  if (!adapterAvailable) {
    await expect(page.locator('.fluid-fallback-wrap')).toBeVisible();
    return;
  }

  const canvas = page.locator('.fluid-webgpu-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.fluid-stats-pill')).toContainText('3456 微粒');
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
