---
id: BE-01
story: S01.3
layer: be
status: todo
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
