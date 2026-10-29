---
id: E01
title: Foundation
status: planned
covers: [NFR6, NFR2]
depends_on: []
branch:
updated: 2026-10-29
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

- [ ] `pnpm db:up` starts both databases on 5442 and 5443.
- [ ] `pnpm verify` passes.
- [ ] `pnpm e2e` passes a smoke test that opens the home page at desktop width and at 375 px.
- [ ] `pnpm qa:serve` prints `http://localhost:4100`, and the home page opens there.
- [ ] `pnpm dev` shows the app at `http://localhost:5173`.
- [ ] `apps/api/CLAUDE.md` and `apps/web/CLAUDE.md` exist.

## Stories

| ID  | Story | Type | Covers | Status |
| --- | ----- | ---- | ------ | ------ |

## Change requests

## Verification

<!-- architect, /epic-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets -->

## Open questions

## Changes
