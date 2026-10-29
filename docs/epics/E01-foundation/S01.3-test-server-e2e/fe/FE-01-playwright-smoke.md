---
id: FE-01
story: S01.3
layer: fe
status: todo
depends_on: [BE-01, BE-02]
covers: [AC5, AC6, AC7, AC8, AC9]
updated: 2026-10-29
---

# FE-01 Playwright set-up and smoke tests

**Goal:** add the `e2e` package with Playwright (desktop and 375 px projects), the smoke tests, and `pnpm e2e`. **Automates:** TC-6.1, TC-7.1, TC-7.2, TC-8.1, TC-9.1. **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `e2e/package.json`, `e2e/tsconfig.json`
- create `e2e/playwright.config.ts`
- create `e2e/tests/smoke.spec.ts`
- change `package.json` (root: `e2e` script)
- change `apps/web/CLAUDE.md` (an "End-to-end tests" section)

## Approach

1. **Package:** `"name": "@labsafe/e2e"`, `"type": "module"`, `"private": true`, devDependencies `@playwright/test` 1.x and `@types/node`. Scripts: `typecheck` (`tsc --noEmit`) and `e2e` (`playwright test`). Don't add a `test` script, or `pnpm test` (and so `pnpm verify`) would start Playwright. `tsconfig.json` extends the base with `module: ESNext`, `moduleResolution: bundler`, `noEmit`. Install Chromium once with `pnpm exec playwright install chromium` (root `CLAUDE.md` notes).
2. **`playwright.config.ts`** (design §6), importing `TEST_ENV` and `TEST_BASE_URL` from `./test-env` (BE-02):
   - `testDir: 'tests'`, `fullyParallel: false`, `workers: 1` (one shared test database), `retries: 0`, `reporter: [['list'], ['html', { open: 'never' }]]`;
   - `use: { baseURL: TEST_BASE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' }`;
   - projects: `desktop` = `devices['Desktop Chrome']` with viewport 1280 × 800; `mobile` = Chromium with viewport 375 × 812, `isMobile: true`, `hasTouch: true`. Chromium only;
   - `webServer: { command: 'node apps/api/dist/main.js', cwd: <repository root, from import.meta.dirname>, env: TEST_ENV, url: TEST_BASE_URL + '/api/health', reuseExistingServer: false, timeout: 60_000 }`. Playwright starts and stops the app itself.
3. **Root script** (design §5): `"e2e": "pnpm build && pnpm test:db:prepare && pnpm --filter @labsafe/e2e e2e"`.
4. **`tests/smoke.spec.ts`:** one `test` per TC; titles start with the identifier (for example `test('TC-7.1 home has no horizontal scroll', …)`). Use role-based locators (`getByRole('heading', { name: 'LabSafe', level: 1 })`, `getByRole('banner')`, `getByRole('link', { name: 'Go to the home page' })`), and web-first assertions (`toBeVisible`, `toHaveURL`, `toHaveTitle`).
   - TC-6.1: the four rooms from the migration, written as `LAB-101 · Teaching lab 1` and so on (S01.1 BE-04).
   - TC-7.1 and TC-7.2: `page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)` after the content is visible.
   - TC-8.1: open `/does-not-exist` directly with `page.goto`. This proves the server-side fallback of BE-01 works together with the client router.
   - TC-9.1: `expect(page.locator('html')).toHaveAttribute('lang', 'en')`.
   Every test runs in both projects.
5. **`apps/web/CLAUDE.md`:** add an "End-to-end tests" section:
   - specs go in `e2e/tests/*.spec.ts` and run in `desktop` and `mobile` (375 px);
   - titles start with the TC identifier;
   - use role-based locators;
   - every new page gets a no-horizontal-scroll check at 375 px (NFR2);
   - run them with `pnpm e2e`; never at the same time as `pnpm verify`.
6. **Proof of work:** `pnpm verify`, then `pnpm e2e` (TC-5.1). Both use only `labsafe_test`. By hand: TC-5.2.

## Out of scope

Seeded instruments and logged-in sessions (`e2e/.auth/`, later epics). The timed M1/M2 test (E06). Other browsers.

## Implementation notes

<!-- Filled in by the dev: what was done, deviations from this ticket or the design and why. -->
