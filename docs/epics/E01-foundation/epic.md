---
id: E01
title: Foundation
status: done
covers: [NFR6, NFR2]
depends_on: []
branch: epic/E01-foundation
updated: 2026-10-30
---

# E01 Foundation

## Goal

A working, fully tested empty LabSafe on the developer's machine, so every later epic only adds features.

Requirements: NFR6 (English interface). Also sets up the base for NFR2 (mobile).

## Scope

- A pnpm workspace with `apps/api` (NestJS), `apps/web` (React with Vite), `packages/shared` (Zod contract, fixed lists, error codes) and `e2e` (Playwright, with desktop and 375 px projects).
- Every tooling command from root `CLAUDE.md`: `pnpm verify`, `e2e`, `qa:serve`, `dev`, `db:up`, `typecheck`, `docs:check`.
- Docker Compose with `postgres:15`: development database on port 5442, test database `labsafe_test` on 5443.
- API basics: configuration checked at start-up, the shared error format, a migration set-up, and `GET /api/health`.
- The fixed lists of PRD §4.2 as shared constants; the `lab_rooms` table with placeholder rooms; `GET /api/meta/lists`.
- Web basics: the app shell (header, layout that works on phones, a "not found" page) and a home page that loads the lists from the API, proving the whole chain works.
- The test app on :4100 is served by Nest itself (API plus the built web app, one origin), as production will be later.
- `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md` with the coding rules and the list of web pages.

## Out of scope

Accounts, safety-page content, and deployment (E08).

## Exit criteria

Each one can be checked by the user, in a browser or by running a command.

- [x] `pnpm db:up` starts both databases on 5442 and 5443.
- [x] `pnpm verify` passes.
- [x] `pnpm e2e` passes a smoke test that opens the home page at desktop width and at 375 px.
- [x] `pnpm qa:serve` prints `http://localhost:4100`, and the home page opens there.
- [x] `pnpm dev` shows the app at `http://localhost:5173`.
- [x] `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md` exist.

## Stories

| ID  | Story | Type | Covers | Status |
| --- | ----- | ---- | ------ | ------ |
| S01.1 | [Workspace, API skeleton and quality gate](S01.1-workspace-api-quality-gate/story.md) | feature | none (base for NFR6, NFR2) | done |
| S01.2 | [Web app shell and home page](S01.2-web-shell-home/story.md) | feature | NFR6, NFR2 | done |
| S01.3 | [One-origin test server and end-to-end tests](S01.3-test-server-e2e/story.md) | feature | NFR2, NFR6 | done |

## Change requests

## Verification

**GREEN** · 2026-10-30

- **Stories:** S01.1, S01.2 and S01.3 are `done` with architect **GREEN** ([S01.1](S01.1-workspace-api-quality-gate/story.md), [S01.2](S01.2-web-shell-home/story.md), [S01.3](S01.3-test-server-e2e/story.md)). Every acceptance criterion across the three stories is implemented as written; evidence is in each story's Verification section (including uncommitted S01.3 work: `e2e/`, `apps/api/test/static.int.test.ts`, `apps/api/src/app.module.ts:27-34`).
- **Exit criteria:** `docker-compose.yml:7-40` exposes dev DB on **5442** and `labsafe_test` on **5443** with `pull_policy: missing` and `pg_isready` checks; `package.json:20,24-27` provides `db:up`, `verify`, `e2e`, `qa:serve` and `dev` as in E01 design §5. [qa.md](qa.md) Run 1 PASS (2026-10-30) covers EC-1–EC-6; main session `pnpm verify` exit 0 and `pnpm e2e` **10 passed** exit 0 on 2026-10-30.
- **Contract (design §4):** `GET /api/health` at `apps/api/src/modules/health/health.controller.ts:14-17` → `HealthResponse` (`packages/shared/src/schemas/health.ts:3-7`); 503 `SERVICE_UNAVAILABLE` when DB is down (`health.service.ts:14-15`). `GET /api/meta/lists` at `meta.controller.ts:9-17` → `MetaListsResponse` (`packages/shared/src/schemas/meta.ts:5-26`, `meta.service.ts:28-37`). Unknown `/api` paths → 404 `NOT_FOUND` (`error.filter.ts:61-62`, `foundation.int.test.ts:45`). Fixed PRD §4.2 lists in `packages/shared/src/lists.ts:6-76` (not DB tables).
- **Data (design §3):** `CreateLabRooms` migration at `apps/api/src/db/migrations/1793232000000-CreateLabRooms.ts:13-25`; `data-source.ts:17` `synchronize: false`. Test DB reset only via `prepare-test-db.ts` after `test-db-guard.ts:15-38` (E01-D4).
- **One-origin test server (design §6–§7):** `ServeStaticModule` when `WEB_DIST_DIR` is set (`app.module.ts:27-34`); Playwright desktop 1280×800 and mobile 375×812 (`e2e/playwright.config.ts:25-47`); smoke specs TC-6.1–TC-9.1 at `e2e/tests/smoke.spec.ts:31-86`; `e2e/test-env.ts` test settings match design §6.
- **Web (NFR6, NFR2):** routes `/` and `*` in `apps/web/src/App.tsx`; shell and home/not-found states per design §8; `apps/web/index.html:2` `lang="en"`. `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md` exist and match design §10 (page list at `apps/web/CLAUDE.md:9-12`).
- **Authorization (design §9):** both endpoints and both screens are public; no auth modules in `apps/` (E02 scope).
- **Scope:** no accounts, safety-page content or deployment beyond E01 [epic.md](epic.md) Out of scope; branch diff `master...HEAD` plus uncommitted changes is foundation-only (workspace, shared package, API, web shell, e2e, docs).
- **Quality gates:** [epic-review.md](epic-review.md) Round 1 **APPROVE** (2026-10-30); thirteen minor findings unticked (F1–F13), none breaks an acceptance criterion. [qa.md](qa.md) Run 1 **PASS** (17/17). Documented implementation differences (for example `createTestApp` in `apps/api/test/helpers.ts:17-18`, `qa-serve.ts` safety additions) are in ticket Implementation notes and S01.3 Verification.
- **Design drift (non-blocking):** E01 `design.md` §2/§5/§6/§15 lags the built tree (`e2e/` files, `typecheck` building shared first, Vitest `.mts`, `NestFactory.create` in tests); reconcile in Mode 5 (`/epic-done` design update), per epic-review F9–F11.

## Open questions

## Changes
