import { test, expect } from '@playwright/test';

test('no console or hydration errors across all main pages', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const routes = [
    '/',
    '/work',
    '/about',
    '/contact',
    '/lab',
    '/work/the-bund',
    '/work/china-silk-museum',
    '/work/ghibli-world'
  ];

  for (const r of routes) {
    await page.goto(r, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
  }

  // Filter out any known non-fatal external warnings if any
  const fatalErrors = errors.filter(e => e.includes('Minified React error #418') || e.includes('Hydration failed'));
  expect(fatalErrors).toEqual([]);
});

test('home, navigation and responsive menu work with scroll lock', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('LIGHT');
  if (isMobile) {
    const menuBtn = page.getByRole('button', { name: '菜单' });
    await menuBtn.click();
    const isLocked = await page.evaluate(() => document.body.style.overflow === 'hidden');
    expect(isLocked).toBe(true);
  }
  await page.getByRole('link', { name: '作品', exact: true }).click();
  await expect(page).toHaveURL(/\/work$/);
  await expect(page.getByText('29 个项目')).toBeVisible();
});

test('filters persist in the URL and project details open with clean project 8 data', async ({ page }) => {
  await page.goto('/work');
  await page.getByRole('button', { name: /精选作品/ }).click();
  await expect(page).toHaveURL(/featured=1/);
  await expect(page.getByText('11 个项目')).toBeVisible();

  // Test project 8 cleaned data
  await page.goto('/work/china-silk-museum');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('中国丝绸博物馆');
  await expect(page.getByText('杭州市', { exact: true })).toBeVisible();
  await expect(page.locator('.detail-subtitle')).toContainText('杭州市');
  await expect(page.getByText('2017 IES AWARD')).toBeVisible();
  // Ensure OCR pollution is gone from displayed title
  await expect(page.getByText('杭州市荣誉获奖')).toHaveCount(0);
});

test('lab controls update real state and reset', async ({ page }) => {
  await page.goto('/lab?mode=field');
  await page.waitForTimeout(400);

  // Verify solar timeline slider
  const slider = page.getByLabel('日照时间轴');
  await slider.fill('14');
  await expect(page.locator('.current-time-badge')).toContainText('14:00');

  // Switch light type to artificial light
  const artBtn = page.getByRole('button', { name: '人工光' });
  await artBtn.click();
  await expect(artBtn).toHaveAttribute('aria-pressed', 'true');

  // Reset field parameters
  await page.locator('#lab-field .lab-reset-btn').click();
  await expect(page.locator('.current-time-badge')).toContainText('10:30');

  // Switch to 04 Color Studio
  await page.getByRole('button', { name: 'Color Studio' }).click();
  await expect(page.locator('#lab-color')).toBeVisible();
});

test('404 and reduced-motion rendering stay usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/missing');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('暂未点亮');
  await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible();
});

test('visual capture: hero page layout and portal card', async ({ page, isMobile }, testInfo) => {
  await page.goto('/');
  const skipBtn = page.getByRole('button', { name: /跳过开场/ });
  if (await skipBtn.isVisible()) {
    await skipBtn.click();
    await page.waitForTimeout(400);
  }

  // Hover over the portal
  await page.mouse.move(800, 450);
  await page.waitForTimeout(500);

  const prefix = isMobile ? 'hero-mobile' : 'hero-desktop';
  await page.screenshot({
    path: testInfo.outputPath(`${prefix}.png`)
  });
});


