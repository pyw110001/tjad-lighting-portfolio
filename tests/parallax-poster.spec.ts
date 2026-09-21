import { test, expect, type Page } from '@playwright/test';

async function openHomePage(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Skip intro animation if present to allow pointer events through
  const skipBtn = page.getByRole('button', { name: '跳过开场 ↗' });
  if (await skipBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
    await skipBtn.click();
  }
  await page.locator('.intro').waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
}

test.describe('Featured Works 3D Parallax Poster Effect', () => {
  test('renders 6 parallax poster cards on Home page without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    await openHomePage(page);

    const posters = page.locator('#selected .project-poster-wrap');
    await expect(posters).toHaveCount(6);

    // Each poster should have required layers: bg, glare, tag, kind, action
    const firstPoster = posters.first();
    await expect(firstPoster.locator('.poster-bg')).toBeVisible();
    await expect(firstPoster.locator('.poster-glare')).toBeAttached();
    await expect(firstPoster.locator('.poster-tag')).toContainText('TJAD · 01');
    await expect(firstPoster.locator('.poster-kind')).toBeVisible();
    await expect(firstPoster.locator('.poster-action .project-open')).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('pointer movement tilts poster and drives dynamic shift CSS variables', async ({ page, isMobile }) => {
    await openHomePage(page);

    const firstWrap = page.locator('#selected .project-poster-wrap').first();
    const firstPoster = firstWrap.locator('.project-poster');

    // Scroll poster into view so IntersectionObserver sees it as visible
    await firstWrap.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const box = await firstWrap.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    if (isMobile) {
      // On mobile emulators, simulate pointer event inside the card
      await firstWrap.dispatchEvent('pointermove', {
        clientX: box.x + box.width * 0.85,
        clientY: box.y + box.height * 0.85
      });
    } else {
      // On desktop, move mouse to bottom-right of first card
      await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.85);
    }

    // Allow spring physics steps to accumulate
    await page.waitForTimeout(300);

    // Read inline style for --shift-x / --shift-y and transform
    const shiftX = await firstPoster.evaluate(el => el.style.getPropertyValue('--shift-x'));
    const shiftY = await firstPoster.evaluate(el => el.style.getPropertyValue('--shift-y'));
    const transform = await firstPoster.evaluate(el => el.style.transform);

    expect(shiftX).toBeTruthy();
    expect(shiftY).toBeTruthy();
    expect(transform).toContain('perspective(900px)');
    expect(transform).toContain('rotateX');
    expect(transform).toContain('rotateY');

    // Float values should be positive when pointer is in bottom-right
    const numX = parseFloat(shiftX);
    const numY = parseFloat(shiftY);
    expect(numX).toBeGreaterThan(0);
    expect(numY).toBeGreaterThan(0);

    // Move pointer away to trigger return to (0, 0)
    if (isMobile) {
      await firstWrap.dispatchEvent('pointerup', { bubbles: true });
    } else {
      await page.mouse.move(10, 10);
    }
    await page.waitForTimeout(600);

    const settledShiftX = await firstPoster.evaluate(el => el.style.getPropertyValue('--shift-x'));
    const settledShiftY = await firstPoster.evaluate(el => el.style.getPropertyValue('--shift-y'));
    const settledNumX = parseFloat(settledShiftX);
    const settledNumY = parseFloat(settledShiftY);

    // Should have converged near 0
    expect(Math.abs(settledNumX)).toBeLessThan(5);
    expect(Math.abs(settledNumY)).toBeLessThan(5);
  });

  test('keyboard arrow keys tilt poster and Escape resets', async ({ page }) => {
    await openHomePage(page);

    const firstWrap = page.locator('#selected .project-poster-wrap').first();
    const firstPoster = page.locator('#selected .project-poster').first();

    await firstWrap.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await firstPoster.focus();

    // Press ArrowRight and ArrowDown
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    const shiftX = await firstPoster.evaluate(el => el.style.getPropertyValue('--shift-x'));
    const shiftY = await firstPoster.evaluate(el => el.style.getPropertyValue('--shift-y'));
    expect(parseFloat(shiftX)).toBeGreaterThan(0);
    expect(parseFloat(shiftY)).toBeGreaterThan(0);

    // Press Escape to reset
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    const resetShiftX = await firstPoster.evaluate(el => el.style.getPropertyValue('--shift-x'));
    const resetShiftY = await firstPoster.evaluate(el => el.style.getPropertyValue('--shift-y'));
    expect(Math.abs(parseFloat(resetShiftX))).toBeLessThan(5);
    expect(Math.abs(parseFloat(resetShiftY))).toBeLessThan(5);
  });

  test('clicking poster card navigates to project detail page', async ({ page }) => {
    await openHomePage(page);

    const firstWrap = page.locator('#selected .project-poster-wrap').first();
    const firstPoster = page.locator('#selected .project-poster').first();

    await firstWrap.scrollIntoViewIfNeeded();
    await firstPoster.click();

    await expect(page).toHaveURL(/\/work\/[a-z0-9-]+$/);
    await expect(page.locator('.detail-page h1')).toBeVisible();
  });

  test('responsive mobile layout does not overflow horizontally', async ({ page }) => {
    await openHomePage(page);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
