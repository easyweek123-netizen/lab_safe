---
id: BE-01
story: S01.3
layer: be
status: done
depends_on: []
covers: [AC1, AC2, AC3]
updated: 2026-10-29
---

# BE-01 Nest serves the built web app

**Goal:** when `WEB_DIST_DIR` is set, Nest serves the built web app for every path outside `/api` (falling back to `index.html`), so test and production use one origin (design §7, design doc D7). **Automates:** TC-1.1, TC-1.2, TC-1.3, TC-2.1, TC-3.1, TC-3.2. **Contract:** [story.md § API contract](../story.md#api-contract) (no new schemas)

## Files

- change `apps/api/package.json` (dependency `@nestjs/serve-static` 5)
- change `apps/api/src/common/config.ts`, `apps/api/src/common/config.test.ts`
- change `apps/api/src/app.module.ts`
- create `apps/api/test/fixtures/web-dist/index.html`
- create `apps/api/test/static.int.test.ts`

## Approach

1. **Configuration** (`config.ts`, S01.1 BE-02): `WEB_DIST_DIR` stays optional. When it is set, resolve it against `process.cwd()` to an absolute path, and refine the schema so that it fails with `WEB_DIST_DIR: no index.html in <path>` when `<path>/index.html` does not exist. `AppConfig.WEB_DIST_DIR` is then the absolute path. Add TC-3.1 and TC-3.2 to `config.test.ts`, using `fs.mkdtempSync` folders in the system temp directory, and delete them afterwards.
2. **`AppModule.forRoot(config)`:** only when `config.WEB_DIST_DIR` is set, add `ServeStaticModule.forRoot({ rootPath: config.WEB_DIST_DIR, exclude: ['/api/{*path}'] })`. Nest 11 uses Express 5, so the wildcard needs the `{*path}` syntax; check that `/api/nope` still reaches Nest's router and the `ErrorFilter` (TC-1.3) instead of getting `index.html`. Without `WEB_DIST_DIR` nothing changes (development uses Vite, AC2).
3. **Fixture:** `test/fixtures/web-dist/index.html`, a minimal formatted page `<!doctype html><html lang="en">…<div id="root">LabSafe fixture page</div>…</html>`. Its marker text is what TC-1.1 and TC-1.2 look for.
4. **`test/static.int.test.ts`:** copy the structure of `test/health.int.test.ts`. One `describe` uses `createTestApp({ WEB_DIST_DIR: <absolute path of the fixture folder, built from this test file's folder> })` for TC-1.1 to TC-1.3. A second `describe` uses `createTestApp()` for TC-2.1. Check `content-type` as well as the body.
5. **Proof of work:** `pnpm verify`. By hand: `pnpm build`, then start `WEB_DIST_DIR=apps/web/dist DATABASE_URL=<test url> PORT=4100 NODE_ENV=test node apps/api/dist/main.js` from the repository root. `http://localhost:4100/does-not-exist` shows the app's not-found page, and `/api/health` answers JSON.

## Out of scope

`pnpm qa:serve` (BE-02), Playwright and `pnpm e2e` (FE-01). Cache headers for static files. The production Dockerfile (E08).

## Implementation notes

<!-- Filled in by the dev: what was done, deviations from this ticket or the design and why, migration names. -->

- **Dependency:** `@nestjs/serve-static` `^5.0.5` in `apps/api/package.json` (lockfile updated). No new peer-dependency warnings (the two remaining ones, `webpack` and `chokidar`, were there before).
- **Configuration:** `WEB_DIST_DIR` is a Zod `transform` that resolves the value with `path.resolve` (against `process.cwd()`) and pushes the issue `no index.html in <absolute path>` unless `<path>/index.html` exists and is a file, so the error reads `Invalid configuration: WEB_DIST_DIR: no index.html in <path>` and `main.ts` exits 1 with that one line (checked by hand on the built `dist/main.js`). `AppConfig.WEB_DIST_DIR` is the absolute path. The existing S01.1 test "TC-7.3 coerces PORT from text and keeps only known settings" no longer passes `WEB_DIST_DIR: 'apps/web/dist'` (a relative folder that need not exist is now refused); TC-3.2 covers the setting instead.
- **`AppModule.forRoot`:** adds `ServeStaticModule.forRoot({ rootPath, exclude: ['/api/{*path}'] })` only when `WEB_DIST_DIR` is set. serve-static appends `/` to the path before matching, so `/api` itself is excluded too. Removing the `exclude` makes the three TC-1.3 404 tests fail (checked).
- **Tests:** `src/common/config.test.ts`: TC-3.1 (empty folder, missing folder, `index.html` that is a folder), TC-3.2 (absolute folder, relative folder resolved against the working directory), with `mkdtempSync` folders deleted in `afterEach`. `test/static.int.test.ts`: TC-1.1 (`/`), TC-1.2 (`/some/deep/link`), TC-1.3 (`/api/health` JSON; `/api/nope`, `/api`, `/api/nope/deeper?x=1` → 404 `application/json` `NOT_FOUND`, without the fixture marker), TC-2.1 (`/` without `WEB_DIST_DIR` → 404 JSON). Every response's `content-type` is checked. Fixture: `test/fixtures/web-dist/index.html`.
- **Difference: `test/helpers.ts` changed (not in the ticket's file list).** `createTestApp` now builds the app with `NestFactory.create(AppModule.forRoot(config), { logger: ['error', 'warn'], abortOnError: false })`, like `main.ts`, instead of `Test.createTestingModule(...).compile()`. Reason: `@nestjs/testing` creates every provider in `compile()`, before the HTTP adapter exists, so serve-static's loader factory sees no adapter and picks its do-nothing `NoopLoader`; `/` then answered 404. Everything else is unchanged (guard, `configureApp`, `app.init()`), and all earlier integration tests still pass. This differs from S01.1 BE-05 step 4 ("with `@nestjs/testing`"); that ticket is not updated here (agents edit only their own ticket). `@nestjs/testing` stays in `devDependencies` although nothing imports it now.
- **Not done by hand:** step 5's run of `dist/main.js` with `WEB_DIST_DIR=apps/web/dist` against `labsafe_test` connects to the database, which needs the user's approval outside the automated commands; the integration tests run the same app with the same module, and BE-02's `pnpm qa:serve` (TC-4.1) checks it in a browser.
- **Migrations:** none.
- **Proof:** `pnpm verify` passes (API unit 46, integration 22, web 9, shared 18; build; docs-check OK).
