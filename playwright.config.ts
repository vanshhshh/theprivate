import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');
const testDb = new URL(process.env.DATABASE_URL!);
if (!testDb.pathname.endsWith('_test')) testDb.pathname = `${testDb.pathname}_test`;
const PORT = 3100;
const env = {
  DATABASE_URL: testDb.toString(),
  BETTER_AUTH_URL: `http://localhost:${PORT}`,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'e2e-secret-not-for-production-use-only',
  STORAGE_LOCAL_DIR: './.data/e2e-storage',
  AUTH_RATE_LIMIT: 'off',
  LOG_LEVEL: 'warn',
};
process.env.E2E_DATABASE_URL = env.DATABASE_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', screenshot: 'only-on-failure', actionTimeout: 20_000, navigationTimeout: 60_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /responsive/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /responsive/ },
  ],
  webServer: { command: `npx next start -p ${PORT}`, url: `http://localhost:${PORT}`, env, reuseExistingServer: false, timeout: 180_000 },
});
