---
id: S01.3
epic: E01
title: One-origin test server and end-to-end tests
type: feature
status: done
covers: [NFR2, NFR6]
updated: 2026-10-30
---

# S01.3 One-origin test server and end-to-end tests

**As** the developer and the qa-engineer **we want** the built app served by Nest on one origin with a fresh test database, and browser tests at desktop width and at 375 px, **so that** every later story can be tested end to end, the same way production will serve it. · Design: [design.md](../design.md) (sections 5–7)

**No role is refused in this story:** every page and endpoint is public (design §9). Depends on [S01.2](../S01.2-web-shell-home/story.md). It reuses `prepare-test-db` and its guard from [S01.1](../S01.1-workspace-api-quality-gate/story.md) (`pnpm test:db:prepare`).

**Try it:** `pnpm db:up` → `pnpm qa:serve` → open `http://localhost:4100`, then Ctrl+C → `pnpm e2e` passes.

## Acceptance criteria

- **AC1** Given the API is started with `WEB_DIST_DIR` pointing at a built web app, When a browser requests `/` or any other path outside `/api`, Then it receives the web app's `index.html`, and every `/api` path still answers JSON, including the 404 `NOT_FOUND` error for an unknown API path.
- **AC2** Given `WEB_DIST_DIR` is not set (development), When `/` is requested from the API, Then the answer is the 404 `NOT_FOUND` JSON error; no web app is served.
- **AC3** Given `WEB_DIST_DIR` is set to a folder without `index.html`, When the API starts, Then it stops with exit code 1 and a message that names `WEB_DIST_DIR`.
- **AC4** Given the test database is running, When the developer runs `pnpm qa:serve`, Then it builds everything, resets and migrates `labsafe_test`, starts the built app on port 4100, prints `QA server: http://localhost:4100` once the app answers, and keeps running until Ctrl+C; Given the test database is not running, Then it stops with "run `pnpm db:up`".
- **AC5** Given the test database is running, When the developer runs `pnpm e2e`, Then it builds everything, resets and migrates `labsafe_test`, runs every spec in the projects `desktop` (1280 × 800) and `mobile` (375 × 812) against the app on :4100, stops the app afterwards, and exits 0 only if every test passed.
- **AC6** Given a freshly prepared test database, When an anonymous visitor opens `/` at desktop width and at 375 px, Then the header, the heading "LabSafe", the four placeholder rooms and the hazard types are visible.
- **AC7** Given a 375 px wide window, When `/` and `/does-not-exist` are shown, Then the page is no wider than the window (no horizontal scrolling).
- **AC8** Given an anonymous visitor enters `/does-not-exist` directly in the address bar, When the test server answers, Then "Page not found" is shown, and its link leads to the home page.
- **AC9** Given any page served by the test server, When it loads, Then the document language is English (`lang="en"`) and the title is "LabSafe".

## Test cases

| TC     | AC  | Role      | Preconditions / data | Steps | Expected | Type | Ticket |
| ------ | --- | --------- | -------------------- | ----- | -------- | ---- | ------ |
| TC-1.1 | AC1 | anonymous | Test app with `WEB_DIST_DIR` = the fixture folder `test/fixtures/web-dist` | 1. `GET /` | 200 `text/html` containing the fixture marker | auto: api | BE-01 |
| TC-1.2 | AC1 | anonymous | Same | 1. `GET /some/deep/link` | 200 `text/html`: the same `index.html` | auto: api | BE-01 |
| TC-1.3 | AC1 | anonymous | Same | 1. `GET /api/health` 2. `GET /api/nope` | 1. 200 JSON `HealthResponse` 2. 404 `application/json` parsing with `ErrorResponse`, code `NOT_FOUND` (not the HTML page) | auto: api | BE-01 |
| TC-2.1 | AC2 | anonymous | Test app without `WEB_DIST_DIR` | 1. `GET /` | 404 JSON, code `NOT_FOUND` | auto: api | BE-01 |
| TC-3.1 | AC3 | —         | An empty temporary folder | 1. `loadConfig({ …valid, WEB_DIST_DIR: <folder> })` | Throws `ConfigError` naming `WEB_DIST_DIR` | auto: unit | BE-01 |
| TC-3.2 | AC3 | —         | A temporary folder with `index.html` | 1. `loadConfig({ …valid, WEB_DIST_DIR: <folder> })` | Returns the absolute path of the folder | auto: unit | BE-01 |
| TC-4.1 | AC4 | developer | Test database up; port 4100 free | 1. `pnpm qa:serve` 2. Open the printed address 3. Ctrl+C | `QA server: http://localhost:4100` is printed only after the app answers; the home page loads with the rooms; Ctrl+C stops the server and frees the port | manual | — |
| TC-4.2 | AC4 | developer | Test database stopped | 1. `pnpm qa:serve` | Stops with "run `pnpm db:up`", no stack trace, non-zero exit | manual | — |
| TC-5.1 | AC5 | developer | Test database up; Chromium installed (`pnpm exec playwright install chromium`, once) | 1. `pnpm e2e` | Every spec runs in `desktop` and `mobile`; all pass; exit 0; nothing listens on 4100 afterwards | manual | — |
| TC-5.2 | AC5 | developer | One expectation in `smoke.spec.ts` changed to a wrong text | 1. `pnpm e2e` 2. Undo the change | Non-zero exit; the report names the failing test and project | manual | — |
| TC-6.1 | AC6 | anonymous | Fresh test database; both projects | 1. Open `/` | `banner` link "LabSafe"; heading 1 "LabSafe"; `LAB-101 · Teaching lab 1` and the other three rooms; "Electrical" and "Biological" | auto: e2e | FE-01 |
| TC-7.1 | AC7 | anonymous | Both projects | 1. Open `/` 2. Wait for the rooms 3. Compare `document.documentElement.scrollWidth` with `clientWidth` | `scrollWidth` ≤ `clientWidth` | auto: e2e | FE-01 |
| TC-7.2 | AC7 | anonymous | Both projects | 1. Open `/does-not-exist` 2. Same comparison | `scrollWidth` ≤ `clientWidth` | auto: e2e | FE-01 |
| TC-7.3 | AC7 | anonymous | `pnpm qa:serve`; browser at 375 × 812 | 1. Look at `/` and `/does-not-exist` | Layout looks right: readable text, no clipped words, comfortable spacing | manual | — |
| TC-8.1 | AC8 | anonymous | Both projects | 1. `page.goto('/does-not-exist')` 2. Click "Go to the home page" | Heading 1 "Page not found"; then the URL is `/` and the rooms are shown | auto: e2e | FE-01 |
| TC-9.1 | AC9 | anonymous | Both projects | 1. Open `/` | `html[lang="en"]`; title "LabSafe" | auto: e2e | FE-01 |

## API contract

No new endpoints and no new shared schemas. This story changes only how the server answers paths outside `/api` when `WEB_DIST_DIR` is set.

| Method | Path | Auth | Request → Response | Status codes |
| ------ | ---- | ---- | ------------------ | ------------ |
| GET | any path outside `/api` (only when `WEB_DIST_DIR` is set) | Public | none → the web app's `index.html` or the requested static file | 200 |
| any | `/api/<unknown>` | Public | none → `ErrorResponse` | 404 `NOT_FOUND` (unchanged) |

## UI states

No new screens. The home and not-found screens of [S01.2](../S01.2-web-shell-home/story.md#ui-states) are now tested in a real browser at desktop width and at 375 px.

## Tickets

In build order (BE first; the first BE ticket implements the contract):

1. [BE-01 Nest serves the built web app](be/BE-01-serve-web-app.md)
2. [BE-02 Test settings and the QA server command](be/BE-02-qa-serve.md)
3. [FE-01 Playwright set-up and smoke tests](fe/FE-01-playwright-smoke.md)

## Out of scope

- The e2e seed data (later epics add it to `prepare-test-db`).
- The timed M1/M2 test (E06), Lighthouse (E06), the production Dockerfile and deployment (E08).
- Browsers other than Chromium.

## Known gaps

Unticked by the user on 2026-10-30 (accepted, not fixed). Full text in [review.md](review.md); QA found no bugs ([qa.md](qa.md)).

- F1 [minor][docs] `createTestApp` now uses `NestFactory.create` instead of `@nestjs/testing`; this is recorded only in BE-01's notes (not in S01.1 BE-05, this story's "Changes" or design §15), and `@nestjs/testing` is now an unused devDependency.
- F2 [minor][docs] E01 design §2 lists an incomplete `e2e/` layout (missing `package.json`, `tsconfig.json`, `test-env.ts`, `qa-serve.ts`).
- F3 [minor][docs] `apps/api/CLAUDE.md` does not list `pnpm qa:serve` among the commands that need no approval.
- F4 [minor][be] `pnpm qa:serve` exits 130 after a normal Ctrl+C, so pnpm reports "Command failed".

## Verification

**GREEN** · 2026-10-30

- **Criterion AC1:** `apps/api/src/app.module.ts:27-34` imports `ServeStaticModule` with `exclude: ['/api/{*path}']` only when `WEB_DIST_DIR` is set; tested by TC-1.1, TC-1.2, TC-1.3 in `apps/api/test/static.int.test.ts:23,31,39,47` (content type, `HealthResponse`, `ErrorResponse` `NOT_FOUND` for `/api/nope`, `/api`, `/api/nope/deeper`).
- **Criterion AC2:** without `WEB_DIST_DIR` the module is not imported (`app.module.ts:27`, `: []`); TC-2.1 at `static.int.test.ts:75`.
- **Criterion AC3:** `apps/api/src/common/config.ts:9-16,35` resolves the path and refuses a folder without an `index.html` file, with the message `WEB_DIST_DIR: no index.html in <path>`; `apps/api/src/main.ts:11-14` exits 1 on `ConfigError`. TC-3.1 and TC-3.2 at `config.test.ts:77,85,93,102,109`.
- **Criterion AC4:** root `package.json:25` `qa:serve` = build → guarded `test:db:prepare` → `e2e/qa-serve.ts`, which waits for `/api/health` and then prints `QA server: http://localhost:4100` (`qa-serve.ts:74-79`) and forwards SIGINT and SIGTERM (`:65-71`). TC-4.1 and TC-4.2 pass by hand ([qa.md](qa.md) run 2; TC-4.2 log at `qa/run2-TC-4.2.txt`).
- **Criterion AC5:** root `package.json:24` `e2e` = build → `test:db:prepare` → Playwright. `e2e/playwright.config.ts:25-47`: the `desktop` project (1280 × 800) and the `mobile` project (375 × 812), `workers: 1`, a `webServer` on :4100 that is never reused. `pnpm e2e` gave 10 passed and exit 0 on 2026-10-30; TC-5.1 and TC-5.2 pass by hand (qa.md run 2).
- **Criteria AC6 to AC9:** tests named TC-6.1, TC-7.1, TC-7.2, TC-8.1 and TC-9.1 at `e2e/tests/smoke.spec.ts:31,50,58,65,81`, with role-based locators. They run in both projects and passed. TC-7.3 was checked by hand (qa.md run 2).
- **Traceability:** every AC has at least one test case. Each of the 11 automated test cases has a passing test whose title starts with its identifier, and they are owned by BE-01 (TC-1.1 to TC-3.2) and FE-01 (TC-6.1 to TC-9.1). The manual test cases TC-4.1, 4.2, 5.1, 5.2 and 7.3 have evidence in qa.md run 2. No role must be refused (design §9).
- **Contract:** no new endpoints or schemas. Paths outside `/api` get `index.html`; an unknown `/api` path still gets the 404 `ErrorResponse` (matches § API contract).
- **Data:** there are no migrations, as the design expects. The test settings in `e2e/test-env.ts:13-18` match design §6, and `DATABASE_URL` equals `TEST_DATABASE_URL` (`apps/api/scripts/test-db-guard.ts:2-6`).
- **Layering:** configuration is read only through `loadConfig()`, and static serving is a module import in `AppModule.forRoot`. Both follow design doc D7 and E01 design §7.
- **Scope:** nothing was built beyond the story. The pre-start health check and the 30 s timeout in `qa-serve.ts:46,81-86` are small safety additions and are documented in BE-02's notes.
- **Differences are written down:** the `createTestApp` switch to `NestFactory.create` is recorded in BE-01's notes and in `apps/api/test/helpers.ts:17-18`. The ESLint ignore change is in FE-01's notes, and the `qa-serve.ts` choices are in BE-02's notes.
- **Documentation, left open by the user's choice (review round 1, F1 to F4 unticked; none of them is a defect against an acceptance criterion):**
  - E01 `design.md` §2 lists an incomplete `e2e/` layout (F2), and §15 does not mention the `createTestApp` change (F1).
  - `@nestjs/testing` is still a devDependency but nothing imports it (F1).
  - `apps/api/CLAUDE.md:19` does not list `pnpm qa:serve` among the commands that need no approval (F3).
  - `qa:serve` exits 130 after Ctrl+C (F4).
  - Not a review finding: the order "reset → build" in `design-doc.md:390-391` differs from the real order "build → reset".
  - All of these are for the architect's design update at `/epic-done`.

## Changes
