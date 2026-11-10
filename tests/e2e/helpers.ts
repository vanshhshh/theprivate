import { execSync } from 'node:child_process';
import { expect, type Page } from '@playwright/test';

export const RUN = Date.now().toString(36);
export const PASSWORD = 'correct-horse-battery';

export function futureDate(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export async function signUp(page: Page, name: string, email: string) {
  await page.goto('/sign-up');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/account');
}

export async function signIn(page: Page, email: string, next = '/account') {
  await page.context().clearCookies();
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(`**${next}`);
}

export function grantRole(email: string, role: string) {
  execSync(`npx tsx scripts/admin.ts ${email} ${role}`, { env: { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL }, stdio: 'pipe' });
}

/** Picks an airport in an AirportCombobox by typing and choosing the option containing `code`. */
export async function pickAirport(page: Page, label: string | RegExp, query: string, code: string, scope = page.locator('body')) {
  const input = scope.getByRole('combobox', { name: label });
  await input.fill(query);
  const option = page.getByRole('listbox').getByRole('option').filter({ hasText: code }).first();
  await expect(option).toBeVisible();
  await option.click();
}

/** Clicks an InlineAction button, then its confirm submit (same label). */
export async function inlineAction(page: Page, label: string | RegExp, reason?: string, scope = page.locator('main')) {
  await scope.getByRole('button', { name: label }).first().click();
  if (reason) await scope.getByRole('textbox').last().fill(reason);
  await scope.getByRole('button', { name: label }).first().click();
}

export const PDF = { name: 'certificate.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF') };
// 1×1 PNG
export const PNG = { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') };

/** Selects the first <option> whose text contains `text`. */
export async function selectByText(page: Page, label: string | RegExp, text: string) {
  const select = page.getByLabel(label);
  const value = await select.locator('option', { hasText: text }).first().getAttribute('value');
  await select.selectOption(value!);
}
