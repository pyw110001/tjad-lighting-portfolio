import { test, expect } from '@playwright/test';

test.describe('Light Lab workbench', () => {
  test.skip(({ isMobile }) => isMobile, 'This redesign targets the desktop workbench.');

  test('keeps the site header visible on scroll and shows one language in the rail', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 650 });
    await page.goto('/lab?mode=lightform');
    await expect(page.locator('.lab-workbench')).toHaveAttribute('data-mode', 'lightform');
    const railLabels = page.locator('.lab-rail-label');
    await expect(railLabels).toHaveText(['昼夜切换', '流光粒子', '色彩粒子场', '建筑光影模拟', '测试项']);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(page.locator('.site-header')).toHaveCSS('position', 'fixed');
    expect((await page.locator('.site-header').boundingBox())?.y).toBe(0);

    await page.getByRole('button', { name: '切换为英文' }).first().click();
    await expect(railLabels).toHaveText(['Day / Night', 'Fluid Light', 'Chroma Field', 'Lightform Studio', 'Photo Lab']);
    await expect(page.locator('.lab-rail-footer')).toContainText('EXPLORE');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(railLabels).toHaveText(['Day / Night', 'Fluid Light', 'Chroma Field', 'Lightform Studio', 'Photo Lab']);
    await page.getByRole('button', { name: 'Switch to Chinese' }).first().click();
    await expect(railLabels.first()).toHaveText('昼夜切换');
    await expect(page.locator('.lab-rail-footer')).toContainText('探索');
  });

  test('shows one scene, five rail entries and a usable console at 1440px', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/lab');
    await expect(page.locator('.lab-rail-item')).toHaveCount(5);
    await expect(page.locator('.lab-workbench')).toHaveAttribute('data-mode', 'day');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('DAY / NIGHT');
    await expect(page.locator('.lab-scene-photo').first()).toHaveAttribute('src', '/assets/light-lab/scenes/day.webp');
    await expect(page.locator('.lab-console')).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, stageHeight: document.querySelector('.lab-stage')?.getBoundingClientRect().height }));
    expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.stageHeight).toBeGreaterThan(650);
    await page.screenshot({ path: testInfo.outputPath('lab-default-day.png') });
    expect(errors).toEqual([]);
  });

  test('removed module URLs resolve to the day/night workbench', async ({ page }) => {
    for (const mode of ['field', 'pixel', 'color']) {
      await page.goto(`/lab?mode=${mode}`);
      await expect(page).toHaveURL(/mode=day/);
      await expect(page.locator('.lab-workbench')).toHaveAttribute('data-mode', 'day');
      await expect(page.locator('.lab-rail-label')).toHaveText(['昼夜切换', '流光粒子', '色彩粒子场', '建筑光影模拟', '测试项']);
      await expect(page.locator('.lab-rail-number')).toHaveText(['01', '02', '03', '04', '05']);
    }
  });

  test('day/night settings survive module switching and reset', async ({ page }) => {
    await page.goto('/lab');
    const timeline = page.getByRole('slider', { name: '昼夜时间轴' });
    await timeline.fill('12');
    await page.locator('.lab-rail-item[data-module="chroma"]').click();
    await expect(page.locator('.lab-workbench')).toHaveAttribute('data-mode', 'chroma');
    await page.goBack();
    await expect(timeline).toHaveValue('12');
    await page.getByRole('button', { name: '重置' }).click();
    await expect(timeline).toHaveValue('19.5');
  });

  test('day/night uses aligned assets, time and keyboard-operable divider', async ({ page }, testInfo) => {
    await page.goto('/lab?mode=day');
    await expect(page.locator('.lab-day-stage img')).toHaveCount(2);
    await expect(page.locator('.lab-day-stage img').nth(0)).toHaveAttribute('src', '/assets/light-lab/scenes/day.webp');
    await expect(page.locator('.lab-day-stage img').nth(1)).toHaveAttribute('src', '/assets/light-lab/scenes/night.webp');
    const divider = page.getByRole('slider', { name: '昼夜对比位置' });
    await divider.focus();
    await divider.press('ArrowRight');
    await expect(divider).toHaveAttribute('aria-valuenow', '67');
    await page.getByRole('button', { name: '白天' }).first().click();
    await expect(page.locator('.lab-day-night-layer')).toHaveCSS('opacity', '0');
    await page.getByRole('button', { name: '夜晚' }).first().click();
    await expect(page.locator('.lab-day-night-layer')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath('lab-day-night.png') });
  });

  test('day/night English UI, help and screenshot export work', async ({ page }) => {
    await page.goto('/lab?mode=day');
    await page.getByRole('button', { name: '切换为英文' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('.lab-stage-copy p')).toContainText('See how the building changes character');
    await page.getByRole('button', { name: /How to use the lab/ }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /Save current scene/ }).click();
    expect((await download).suggestedFilename()).toMatch(/TJAD-Light-Lab-day\.png/);
    await expect(page.locator('.lab-message')).toContainText('Scene saved');
  });

  test('reduced motion and missing WebGL retain day/night comparison', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (...args) {
        if (args[0] === 'webgl2') return null;
        return getContext.apply(this, args as Parameters<typeof getContext>);
      } as typeof getContext;
    });
    await page.goto('/lab?mode=day');
    await expect(page.locator('.lab-scene-photo').first()).toBeVisible();
    await expect(page.locator('.lab-effect-canvas')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '对比播放' })).toBeDisabled();
    await expect(page.getByRole('slider', { name: '昼夜时间轴' })).toBeVisible();
  });
});
