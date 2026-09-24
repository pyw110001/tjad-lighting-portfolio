import { test, expect } from '@playwright/test';

test.describe('LIGHT LAB Redesign - 5-Module Interactive Architecture', () => {
  test('renders top celestial hero, all 5 experiment cards, and user guide', async ({
    page
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.goto('/lab', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Hero title and celestial elements
    await expect(page.locator('.lab-main-title')).toContainText('LIGHT LAB');
    await expect(page.locator('.sun-disc-handle')).toBeVisible();

    // 5 Navigation Anchor Items
    const navItems = page.locator('.arc-nav-item');
    await expect(navItems).toHaveCount(5);

    // All 5 Experiment Cards
    await expect(page.locator('#lab-field')).toBeVisible();
    await expect(page.locator('#lab-pixel')).toBeVisible();
    await expect(page.locator('#lab-day')).toBeVisible();
    await expect(page.locator('#lab-color')).toBeVisible();
    await expect(page.locator('#lab-wave')).toBeVisible();

    // Bottom User Guide
    await expect(page.locator('.card-guide')).toBeVisible();
    await expect(page.locator('.guide-step')).toHaveCount(4);

    expect(consoleErrors).toEqual([]);
  });

  test('01 LIGHT FIELD: solar timeline slider and compass angle update state', async ({
    page
  }) => {
    await page.goto('/lab', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const fieldCard = page.locator('#lab-field');
    await fieldCard.scrollIntoViewIfNeeded();

    // Drag timeline slider to 16:00
    const slider = fieldCard.getByLabel('日照时间轴');
    await slider.fill('16');
    await expect(fieldCard.locator('.current-time-badge')).toContainText('16:00');

    // Sun disc on hero should reflect time progression
    const sunHandle = page.locator('.sun-disc-handle');
    const styleLeft = await sunHandle.evaluate(el => el.style.left);
    expect(parseFloat(styleLeft)).toBeGreaterThan(50); // After noon

    // Click Artificial light button
    const artBtn = fieldCard.getByRole('button', { name: '人工光' });
    await artBtn.click();
    await expect(artBtn).toHaveAttribute('aria-pressed', 'true');

    // Click Reset button
    await fieldCard.locator('.lab-reset-btn').click();
    await expect(fieldCard.locator('.current-time-badge')).toContainText('10:30');
  });

  test('02 PIXEL FACADE: pattern selection and pause/play toggle', async ({
    page
  }) => {
    await page.goto('/lab', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const pixelCard = page.locator('#lab-pixel');
    await pixelCard.scrollIntoViewIfNeeded();

    // Click Ripple pattern
    const rippleBtn = pixelCard.locator('.toolbar-btn', { hasText: '涟漪' });
    await rippleBtn.click();
    await expect(rippleBtn).toHaveAttribute('aria-pressed', 'true');

    // Click Wave thumbnail preset
    const waveThumb = pixelCard.locator('.preset-thumb-btn', { hasText: '波浪' });
    await waveThumb.click();
    await expect(waveThumb).toHaveClass(/selected/);

    // Toggle pause/play
    const pauseBtn = pixelCard.locator('.add-btn');
    await expect(pauseBtn).toContainText('❚❚');
    await pauseBtn.click();
    await expect(pauseBtn).toContainText('▶');
  });

  test('03 DAY / NIGHT: interactive split slider and time scrubbing strategy', async ({
    page,
    isMobile
  }) => {
    await page.goto('/lab', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const dayCard = page.locator('#lab-day');
    await dayCard.scrollIntoViewIfNeeded();

    await expect(dayCard.locator('.layer-day img')).toHaveAttribute(
      'src',
      '/assets/light-lab/comparisons/century-square-day.webp'
    );
    await expect(dayCard.locator('.compare-simulated-night')).toHaveAttribute(
      'src',
      '/assets/projects/century-square/01_图-1425.webp'
    );
    if (isMobile) {
      expect((await dayCard.locator('.compare-stage').boundingBox())?.height).toBeGreaterThan(180);
    }

    // Check badges
    await expect(dayCard.locator('.badge-day')).toContainText('06:30');
    await expect(dayCard.locator('.badge-night')).toContainText('19:30');

    // Drag / click timeline tick for 24:00 (Late-night energy saving mode)
    const tick24 = dayCard.locator('.timeline-tick', { hasText: '24:00' });
    await tick24.click();
    await expect(dayCard.locator('.strategy-card strong')).toContainText('深夜节能模式');
    await expect(dayCard.locator('.compare-simulated-night')).toHaveCSS('opacity', '1');

    // Click 12:00
    const tick12 = dayCard.locator('.timeline-tick', { hasText: '12:00' });
    await tick12.click();
    await expect(dayCard.locator('.strategy-card strong')).toContainText('正午顶光抑制');
    await expect(dayCard.locator('.compare-simulated-night')).toHaveCSS('opacity', '0');
    await expect(dayCard.locator('.badge-night')).toContainText('Day 12:00');
  });

  test('04 COLOR STUDIO: 4 spatial lighting presets switch active state', async ({
    page
  }) => {
    await page.goto('/lab', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const colorCard = page.locator('#lab-color');
    await colorCard.scrollIntoViewIfNeeded();

    // 4 preset cards
    const warmBtn = colorCard.getByRole('button', { name: /暖光 3000K/ });
    const neutralBtn = colorCard.getByRole('button', { name: /中性光 4000K/ });
    const coolBtn = colorCard.getByRole('button', { name: /冷白光 6000K/ });
    const rgbBtn = colorCard.getByRole('button', { name: /彩色光/ });

    await expect(warmBtn).toHaveAttribute('aria-pressed', 'true');

    await coolBtn.click();
    await expect(coolBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(warmBtn).toHaveAttribute('aria-pressed', 'false');

    await rgbBtn.click();
    await expect(rgbBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('User Guide: step 4 triggers screenshot export without errors', async ({
    page
  }) => {
    await page.goto('/lab', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const guideCard = page.locator('.card-guide');
    await guideCard.scrollIntoViewIfNeeded();

    const step4 = guideCard.locator('.step-clickable');
    await step4.click();

    // Should display completion toast
    await expect(guideCard.locator('.copied-toast')).toBeVisible();
  });

  test('Visual capture: capture screenshot of 02 PIXEL FACADE', async ({ page }) => {
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const fieldCard = page.locator('#lab-field');
    await fieldCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await fieldCard.screenshot({ path: 'tests/artifacts/field-current.png' });

    const pixelCard = page.locator('#lab-pixel');
    await pixelCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await pixelCard.screenshot({ path: 'tests/artifacts/pixel-wave.png' });

    // Click Ripple
    await pixelCard.locator('.toolbar-btn', { hasText: '涟漪' }).click();
    await page.waitForTimeout(500);
    await pixelCard.screenshot({ path: 'tests/artifacts/pixel-ripple.png' });

    // Click Flow
    await pixelCard.locator('.toolbar-btn', { hasText: '流动' }).click();
    await page.waitForTimeout(500);
    await pixelCard.screenshot({ path: 'tests/artifacts/pixel-flow.png' });

    // Click Pattern / Lattice
    await pixelCard.locator('.toolbar-btn', { hasText: '图案' }).click();
    await page.waitForTimeout(500);
    await pixelCard.screenshot({ path: 'tests/artifacts/pixel-lattice.png' });

    // Click Text
    await pixelCard.locator('.toolbar-btn', { hasText: '文字' }).click();
    await page.waitForTimeout(500);
    await pixelCard.screenshot({ path: 'tests/artifacts/pixel-text.png' });
  });
});
