---
id: S01.3
epic: E01
title: One-origin test server and end-to-end tests
type: feature
status: draft
covers: [NFR2, NFR6]
updated: 2026-10-29
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

## Verification

<!-- architect, /story-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets (file:line) -->

## Changes
