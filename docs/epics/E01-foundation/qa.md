# QA: E01 Foundation

Tick (`[x]`) the bugs `/fix` should handle. Add instructions as `> note` lines under a bug.

## Run 1 · 2026-10-30 · verdict: PASS

Application: `pnpm qa:serve` (fresh test database `labsafe_test` on 5443) · Address: `http://localhost:4100` · Dev: `pnpm dev` already running at `http://localhost:5173` · Browser: Playwright MCP Chromium (desktop and 375 × 812 emulation) plus Playwright Chromium for keyboard check on :5173.

Epic browser QA covers exit criteria, the one-origin QA server, the Vite dev proxy, and a regression smoke across [S01.1](S01.1-workspace-api-quality-gate/story.md), [S01.2](S01.2-web-shell-home/story.md) and [S01.3](S01.3-test-server-e2e/story.md). TC-4.2 (qa:serve with the test database stopped) was **not rerun**; it was already proven in [S01.3 qa run 2](S01.3-test-server-e2e/qa.md) with the user's approval.

| ID | Role | Result | Screenshot / evidence |
| --- | --- | --- | --- |
| E01-EC-1 | developer | ✅ `docker compose ps`: `labsafe-db-1` healthy on **5442**, `labsafe-db-test-1` healthy on **5443** (both were up for `qa:serve`; `db:up` not rerun without separate approval) | — |
| E01-EC-2 | developer | ✅ `pnpm verify`: format, lint, typecheck, unit tests (shared 18, api 46, web 9), integration tests 22, build, `docs:check` — exit 0 | — |
| E01-EC-3 | developer | ✅ `pnpm e2e`: **10 passed** (5 specs × `desktop` + `mobile`), exit 0; port 4100 free afterwards | — |
| E01-EC-4 | developer | ✅ `pnpm qa:serve` printed `QA server: http://localhost:4100` after Nest started; home answered with the four rooms | [log](qa/run1-qa-serve.txt) · [home](qa/run1-qa-home-desktop.png) |
| E01-EC-5 | developer | ✅ `http://localhost:5173` returns 200; home shows the four rooms and hazard types via the Vite proxy | [home](qa/run1-dev-home.png) |
| E01-EC-6 | user | ✅ `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md` exist | — |
| E01-QA-1 | anonymous | ✅ Home at :4100: banner link "LabSafe", h1 "LabSafe", LAB-101–LAB-202, hazard types incl. Electrical and Biological | [desktop](qa/run1-qa-home-desktop.png) |
| E01-QA-2 | anonymous | ✅ `/does-not-exist`: h1 "Page not found", link "Go to the home page" | [desktop](qa/run1-qa-notfound-desktop.png) |
| E01-QA-3 | anonymous | ✅ Deep link `/some/deep/link` → same SPA, "Page not found" (curl 200 `text/html`; browser shows not-found UI) | — |
| E01-QA-4 | anonymous | ✅ `/api/health` → 200 `{"status":"ok","database":"ok"}`; `/api/nope` → 404 JSON `NOT_FOUND` (not HTML) | [log](qa/run1-api-health.txt) |
| E01-QA-5 | anonymous | ✅ 375 × 812: home and not-found, `scrollWidth` = `clientWidth` = 375; readable layout | [home](qa/run1-qa-home-375.png) · [not found](qa/run1-qa-notfound-375.png) |
| E01-QA-6 | anonymous | ✅ No forms on public pages. Keyboard: Tab → header "LabSafe", Tab → "Go to the home page", Enter → `/` with rooms (Playwright on :5173, same UI) | [log](qa/run1-keyboard.txt) |
| E01-DEV-1 | anonymous | ✅ Dev home at :5173 matches QA content (rooms + hazard types) | [img](qa/run1-dev-home.png) |
| E01-DEV-2 | anonymous | ✅ Dev `/does-not-exist` inside the app shell | [img](qa/run1-dev-notfound.png) |
| REG-S01.1 | developer | ✅ Regression: `curl localhost:3000/api/health` → ok; `GET /api/meta/lists` returns hazard types and lab rooms (dev API on :3000) | — |
| REG-S01.2 | anonymous | ✅ Regression: home lists from the API on both :4100 and :5173 (see E01-QA-1, E01-DEV-1) | — |
| REG-S01.3 | developer | ✅ Regression: TC-4.2 evidence unchanged from [S01.3 qa run 2](S01.3-test-server-e2e/qa/run2-TC-4.2.txt); S01.3 `auto: e2e` cases covered by this run's `pnpm e2e` | — |

**Counts:** 17 / 17 passed · 0 failed.

Bugs: none.

Specs added: none. All S01.3 `auto: e2e` test cases already live in `e2e/tests/smoke.spec.ts` (FE-01). · **`pnpm e2e`:** 10 passed, exit 0.

Screenshots folder: [docs/epics/E01-foundation/qa/](qa/).
