import { test, expect } from '@playwright/test';

test('WebGL gold flow begins on Hero scroll, reaches Selected Work, pauses offscreen, and reverses', async ({ page }) => {
  await page.goto('/');
  const skip = page.getByRole('button', { name: /跳过开场/ });
  if (await skip.isVisible()) await skip.click();

  const flow = page.locator('.gold-particle-flow');
  const progress = async () => Number(await flow.getAttribute('data-progress'));
  if (await page.evaluate(() => matchMedia('(max-width: 1100px)').matches)) {
    await expect(flow).toBeHidden();
    return;
  }
  await expect(flow).toBeVisible();
  await expect(flow).toHaveAttribute('aria-hidden', 'true');
  await expect(flow).toHaveAttribute('data-webgl', 'ready');
  expect(await progress()).toBeLessThan(0.01);
  await expect(flow).toHaveAttribute('data-rendering', 'false');

  await page.evaluate(() => window.scrollTo({ top: 20, behavior: 'instant' }));
  await expect.poll(progress).toBeGreaterThan(0.01);

  await page.evaluate(() => window.scrollTo({ top: 250, behavior: 'instant' }));
  await expect.poll(progress).toBeGreaterThan(0.3);

  await page.evaluate(() => window.scrollTo({ top: 550, behavior: 'instant' }));
  await expect.poll(progress).toBeGreaterThan(0.35);
  await expect(flow).toHaveAttribute('data-rendering', 'true');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(flow).toHaveAttribute('data-rendering', 'false');
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(flow).toHaveAttribute('data-rendering', 'true');
  await page.evaluate(() => window.scrollTo({ top: 1050, behavior: 'instant' }));
  await expect.poll(progress).toBeGreaterThan(0.99);
  await page.evaluate(() => window.scrollTo({ top: 2200, behavior: 'instant' }));
  await expect(flow).toHaveAttribute('data-rendering', 'false');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(progress).toBeLessThan(0.01);
  await expect(flow).toHaveAttribute('data-rendering', 'false');

  await expect(page.getByRole('link', { name: '探索精选作品' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reduced motion hides decorative particles while work navigation remains available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.gold-particle-flow')).toBeHidden();
  await page.getByRole('link', { name: '探索精选作品' }).click();
  await expect(page.locator('#selected .section-title')).toBeVisible();
});

test('project title reveals an arrow and rolls its letters without shifting the card', async ({ page }) => {
  await page.goto('/');
  const title = page.locator('.home-projects .project-card').first().locator('.project-title-link');
  await title.scrollIntoViewIfNeeded();
  const arrow = title.locator('.project-title-arrow');
  const heading = title.locator('h3');
  const heightBefore = (await heading.boundingBox())?.height;
  await expect.poll(() => arrow.evaluate(element => element.getBoundingClientRect().width)).toBeLessThan(1);

  await title.hover();
  await expect.poll(() => arrow.evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(55);
  await expect.poll(() => title.locator('.project-title-letter-track').first()
    .evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
  expect((await heading.boundingBox())?.height).toBe(heightBefore);

  await page.mouse.move(1400, 40);
  await expect.poll(() => arrow.evaluate(element => element.getBoundingClientRect().width)).toBeLessThan(1);

  await title.focus();
  await expect.poll(() => arrow.evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(55);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/work\//);
});
