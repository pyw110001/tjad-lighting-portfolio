import { test, expect } from '@playwright/test';

test('home opens without intro and language choice persists across pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.intro')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('LIGHT GIVES FORM');

  await page.getByRole('button', { name: '切换为英文' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.hero-chinese-sub')).toHaveText('LIGHT SHAPES SPACE.');
  await expect(page.getByText('All 29 projects')).toBeVisible();

  await page.goto('/work');
  await expect(page.getByPlaceholder('Search projects, cities, types…')).toBeVisible();
  await expect(page.getByText('29 projects', { exact: true })).toBeVisible();
  await page.goto('/work/the-bund');
  await expect(page.getByRole('heading', { level: 2, name: 'Project details' })).toBeVisible();
  await expect(page.locator('.detail-intro')).toContainText('lighting');
  await expect(page.locator('.detail-intro')).not.toContainText('项目简介');
  await expect(page).toHaveTitle(/The Bund Historic Buildings Lighting Renewal/);
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Light begins with architecture.');
  await page.goto('/contact');
  await expect(page.getByRole('heading', { level: 2, name: 'Project enquiries' })).toBeVisible();
  await page.goto('/lab');
  await expect(page.locator('.lab-stage-copy p')).toContainText('See how the building changes character through the day.');

  await page.getByRole('button', { name: 'Switch to Chinese' }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByText('光的实验室', { exact: true }).first()).toBeVisible();
});
