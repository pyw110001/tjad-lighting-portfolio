import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/123/.gemini/antigravity/brain/715b839f-3cf2-499a-b4c0-0d60e82753c8';

test('UI showcase renders and handles all interactive states', async ({ page, isMobile }) => {
  await page.goto('/ui-showcase', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Check main heading
  await expect(page.getByRole('heading', { name: 'Design System & Component Showcase' })).toBeVisible();

  // Test Segmented Control click
  const pixelTab = page.getByRole('radio', { name: '像素立面' });
  await pixelTab.click();
  await expect(pixelTab).toHaveAttribute('aria-checked', 'true');

  // Test Light Switch toggle
  const switchBtn = page.getByRole('switch', { name: '反馈状态开关' });
  await expect(switchBtn).toHaveAttribute('aria-checked', 'true');
  await switchBtn.click();
  await expect(switchBtn).toHaveAttribute('aria-checked', 'false');

  // Test Light Preset Card selection
  const twilightPreset = page.getByRole('button', { name: /03 暮光漫射/ });
  await twilightPreset.click();
  await expect(twilightPreset).toHaveAttribute('aria-pressed', 'true');

  // Scroll through page to trigger ScrollTrigger reveals
  await page.evaluate(async () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 400));
  });

  // Capture Screenshot
  if (!isMobile) {
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'ui-showcase-desktop.png'),
      fullPage: true,
    });

    // Test Fullscreen Menu Trigger and Capture
    const menuBtn = page.getByRole('button', { name: 'Open Fullscreen Light Curtain Menu' });
    await menuBtn.click();
    await page.waitForTimeout(600);
    await expect(page.getByRole('dialog', { name: '全屏导航菜单' })).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'ui-showcase-curtain.png'),
    });

    // Close menu with Esc
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'ui-showcase-mobile.png'),
      fullPage: true,
    });
  }
});
