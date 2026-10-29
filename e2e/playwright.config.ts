/**
 * Playwright for `pnpm e2e` (E01 design §6, S01.3 AC5). The root script first builds everything and
 * resets `labsafe_test`; Playwright then starts the built app on :4100 with the test settings, runs
 * every spec at desktop width and at 375 px, and stops the app.
 */
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { TEST_BASE_URL, TEST_ENV } from './test-env';

/** The relative paths in `TEST_ENV` (and the app's path) are resolved against the repository root. */
const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');

export default defineConfig({
  testDir: 'tests',
  // One shared test database: one test at a time.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: TEST_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'node apps/api/dist/main.js',
    cwd: REPOSITORY_ROOT,
    env: TEST_ENV,
    url: `${TEST_BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
