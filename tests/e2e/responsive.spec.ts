/** Mobile viewport checks: no horizontal overflow, navigation usable, key pages render without errors. */
import { expect, test } from '@playwright/test';

for (const path of ['/', '/charter', '/empty-legs', '/aircraft-for-sale', '/operators', '/for-operators', '/contact', '/sign-in']) {
  test(`mobile: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('mobile: menu opens and navigates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'One-way offers' }).click();
  await page.waitForURL('**/empty-legs');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
