---
status: approved
updated: 2026-10-29
---

# E01 design

**Covers:** NFR6, NFR2 (base) · **Depends on:** none · This is the setup guide for the whole repository; later epics only add features.

## 1. Libraries and versions

The rule: the newest major version that is at least 3 months old and compatible with the other packages. The exceptions are noted.

| Area | Package (major) | Note |
| --- | --- | --- |
| Runtime | Node 24, pnpm 11 | `"packageManager": "pnpm@11"` and `.nvmrc` |
| Language | TypeScript **6.0** | 7.0 is out, but typescript-eslint supports only `< 6.1` |
| API | NestJS **11** (`@nestjs/core`, `common`, `platform-express`, `typeorm`, `serve-static` 5) | 12.0 is only 2 months old |
| Database access | TypeORM **0.3**, `pg` 8 | 1.x is a recent rewrite; the design and the agents are written for 0.3 |
| Contract | Zod **4** | Shared by the API and the web app |
| Shared build | tsup 8 | Builds `packages/shared` to both ESM and CommonJS |
| Web | React 19, Vite 8, `@vitejs/plugin-react` 6, React Router 8, TanStack Query 5, Tailwind CSS 4 (`@tailwindcss/vite`) | |
| Unit and integration tests | Vitest **4**, `unplugin-swc` 2 with `@swc/core` 1, Supertest 7 | Vitest 5 is only 2 months old |
| Web tests | Testing Library (React 16), jsdom, MSW **2** | MSW 3 is 1 month old |
| End-to-end tests | `@playwright/test` 1.x (Chromium only) | |
| Quality | ESLint 10 (flat config) with typescript-eslint 8 and react-hooks; Prettier 3 | |
| Scripts | `concurrently` 10, `tsx` 4 | |

## 2. Repository layout

```
package.json            root scripts (section 5); devDependencies for lint, format, test tools
pnpm-workspace.yaml     packages: apps/*, packages/*, e2e   ·   allowBuilds: the native builds pnpm asks for (expected: @swc/core, esbuild)
tsconfig.base.json      strict: true, noUncheckedIndexedAccess, target ES2023
eslint.config.mjs  ·  .prettierrc  ·  .prettierignore  ·  .nvmrc  ·  .env.example
docker-compose.yml      db (dev, 5442) and db-test (labsafe_test, 5443)
packages/shared/        src/lists.ts · src/errors.ts · src/schemas/{health,meta}.ts · src/index.ts → dist (ESM + CJS + types)
apps/api/               src/main.ts · src/app.module.ts
                        src/common/   config.ts · error.filter.ts · zod-validation.pipe.ts
                        src/modules/  health/ · meta/
                        src/db/       data-source.ts · migrations/
                        scripts/      prepare-test-db.ts
                        test/         integration tests (*.int.test.ts) and helpers
                        CLAUDE.md
apps/web/               src/main.tsx · src/App.tsx (routes) · src/pages/{home,not-found}/ · src/components/ · src/api/
                        CLAUDE.md
e2e/                    playwright.config.ts · tests/smoke.spec.ts
```

## 3. Data

```mermaid
erDiagram
  lab_rooms {
    uuid id PK "gen_random_uuid()"
    text code UK "for example LAB-101"
    text name "for example Teaching lab 1"
  }
```

- **One migration:** `CreateLabRooms` creates the table and inserts four placeholder rooms (PRD §7 says the real rooms replace them before the demo). `synchronize` is always `false`.
- **Fixed lists** (PRD §4.2) are **not** tables. They live in `packages/shared/src/lists.ts` as `as const` arrays of `{ value, label }`. The value is an upper-case code (for example `HOT_SURFACE`); the label is English. A shared `HazardLevel` (LOW, MEDIUM, HIGH) is defined there too. The CHECK constraints that use these lists come with the tables that need them (E03).
- **Migrations run** through `src/db/data-source.ts`: from the CLI for the development database (`pnpm db:migrate`, which asks the user first), and from code for the test database (section 6).

## 4. Contract

| Method | Path | Who may call | Request → Response | Errors |
| --- | --- | --- | --- | --- |
| GET | /api/health | Public | none → `HealthResponse` `{ status: "ok", database: "ok" }` | 503 `SERVICE_UNAVAILABLE` if the database is unreachable |
| GET | /api/meta/lists | Public | none → `MetaListsResponse` `{ hazardTypes, protectiveEquipment, hazardPictograms, categories, hazardLevels, labRooms }` | 500 |
| any | /api/<unknown> | Public | none | 404 `NOT_FOUND` in the shared error format |

- **Error format** (design doc §8): `ErrorResponse` and the `ErrorCode` enum are defined in `packages/shared/src/errors.ts`. A global `ErrorFilter` produces this shape for every error, and never leaks stack traces.
- **`ZodValidationPipe`** turns shared Zod schemas into `400 VALIDATION_FAILED` with a `fields` list. It is unused by any endpoint in E01, but unit-tested so E02 can rely on it.

## 5. Tooling commands

| Command | What it runs |
| --- | --- |
| `pnpm db:up` | `docker compose up -d --wait db db-test` (`pull_policy: missing`, so the local `postgres:15` image is used) |
| `pnpm dev` | `concurrently`: shared `tsup --watch`, `nest start --watch` on :3000 (`node --env-file-if-exists=.env`), and Vite on :5173 (which proxies `/api` to :3000) |
| `pnpm typecheck` | `pnpm -r typecheck`, which is `tsc --noEmit` in every package |
| `pnpm verify` | `format:check` → `lint` → `typecheck` → `test` (unit and web) → `test:int` (API integration) → `build` → `docs:check`. It stops at the first failure |
| `pnpm e2e` | `build` → `test:db:prepare` → `playwright test` (Playwright starts the app itself, section 6) |
| `pnpm qa:serve` | `build` → `test:db:prepare` → start the built app on :4100 with the test settings, and print `QA server: http://localhost:4100` |
| `pnpm docs:check` | `node .claude/tools/docs-check.mjs` |

Supporting scripts: `build` (shared → api → web, in dependency order), `test`, `test:int`, `test:db:prepare`, `lint`, `format`, `format:check`, `db:migrate`, `db:down`.

## 6. How each kind of test runs

| Kind | Where | How |
| --- | --- | --- |
| Unit (`auto: unit`) | `*.test.ts` next to the code, in api and shared | Vitest. The API uses `unplugin-swc` so Nest decorators work. No database |
| API integration (`auto: api`) | `apps/api/test/*.int.test.ts` | Vitest with a separate config. `globalSetup` runs `prepare-test-db` (empty schema, then migrations). Files run one at a time (`fileParallelism: false`); a `resetTables()` helper empties every table except `lab_rooms` and the migration records before each file. The real Nest app is tested with Supertest |
| Web (`auto: web`) | `*.test.tsx` next to the code | Vitest with jsdom, Testing Library, and MSW handlers built from the shared schemas |
| End-to-end (`auto: e2e`) | `e2e/tests/*.spec.ts` | Playwright with two projects: **desktop** (1280×800) and **mobile** (375×812). `webServer` starts `node apps/api/dist/main.js` on :4100 with the test settings |

**Test settings** (not secrets, kept in `e2e/test-env.ts` and reused by `qa:serve`): `DATABASE_URL=postgres://labsafe:labsafe@localhost:5443/labsafe_test`, `PORT=4100`, `NODE_ENV=test`, `WEB_DIST_DIR=apps/web/dist`.

**`prepare-test-db` safety guard:** it refuses to run unless the database name is `labsafe_test` and the port is `5443`. Only then does it drop and recreate the `public` schema, run the migrations and (in later epics) load the e2e seed.

**Test names** start with the test-case identifier, for example `it('TC-2.1 …')` or `test('TC-3.1 …')`.

```mermaid
sequenceDiagram
  actor Dev as Developer / agent
  participant P as pnpm e2e
  participant DB as labsafe_test :5443
  participant App as Built app :4100
  participant PW as Playwright
  Dev->>P: pnpm e2e
  P->>P: build shared → api → web
  P->>DB: guard (name + port) → drop schema → migrations
  P->>PW: playwright test
  PW->>App: webServer: start node apps/api/dist/main.js
  PW->>App: run every spec (desktop and 375 px)
  PW-->>Dev: pass/fail report; the server stops
```

## 7. Serving and configuration

- **Global prefix `/api`.** When `WEB_DIST_DIR` is set (in test and later in production), `@nestjs/serve-static` serves the built web app and falls back to `index.html` for any path outside `/api`. This gives one origin (design doc D7).
- **Configuration:** `src/common/config.ts` checks `process.env` with a Zod schema at start-up and stops with a clear message on a bad value. In E01 it reads `NODE_ENV`, `PORT` (default 3000), `DATABASE_URL` and an optional `WEB_DIST_DIR`. Later epics add their own settings. `.env.example` lists them; the development `.env` is loaded by Node's `--env-file-if-exists`, with no extra library.
- **Docker:** `db` uses user `labsafe`, database `labsafe`, port 5442 and a named volume. `db-test` uses database `labsafe_test`, port 5443, and stores its data in memory (`tmpfs`). Both have a `pg_isready` health check.

## 8. Screens and states

| Route | Screen | States (loading / empty / error / success) | Roles |
| --- | --- | --- | --- |
| `/` | Home: the LabSafe name, a one-line purpose, and the lab rooms and hazard types loaded from `/api/meta/lists`. Replaced by search in E06 | Loading placeholder · (no empty state: the lists are never empty) · "Couldn't load, try again" with a retry button · lists shown | everyone |
| `*` | Not found, with a link home | Static | everyone |

**App shell:** a header with the LabSafe wordmark and a main area with a maximum width, built mobile-first so there is no horizontal scrolling at 375 px. `<html lang="en">`; all text is English (NFR6).

## 9. Authorization matrix

| Endpoint / screen | anonymous | pending | contributor | admin |
| --- | --- | --- | --- | --- |
| GET /api/health, GET /api/meta/lists, `/`, not found | ✓ | ✓ | ✓ | ✓ |

Accounts arrive in E02, which adds the deny-by-default guard. Until then, both E01 endpoints are explicitly public.

## 10. What the app `CLAUDE.md` files must say

- **`apps/api/CLAUDE.md`:**
  - Module layout (`controller → service → repository`, with thin controllers).
  - Every input is parsed with a shared Zod schema through `ZodValidationPipe`.
  - Return mapped objects, never entities.
  - Errors use `ErrorCode` through the filter.
  - Migrations: generate, read every line, keep; never `synchronize`; destructive commands only on `labsafe_test`.
  - Integration-test helpers (`createTestApp`, `resetTables`) and test naming.
  - Database commands need the user's approval.
- **`apps/web/CLAUDE.md`:**
  - The **list of web pages** (route → page folder → epic), which each epic extends.
  - Data access only through hooks in `src/api` that validate responses with the shared schemas.
  - Every page handles loading, empty, error and success.
  - Mobile-first at 375 px; accessible markup (labels, alt text, information never shown by colour alone).
  - Tailwind only, no other CSS framework; component tests with MSW; test naming.

## 11. Decisions

| # | Decision | Why | Alternatives considered |
| --- | --- | --- | --- |
| E01-D1 | Pinned major versions as in section 1 (the newest major at least 3 months old and compatible) | Stable foundation; no major upgrades inside stories (root CLAUDE.md) | Always the latest (TypeScript 7 breaks ESLint; NestJS 12 and Vitest 5 are very new) |
| E01-D2 | `packages/shared` is built with tsup to ESM and CommonJS | The CommonJS Nest API and the ESM Vite app both use it without tricks | Source-only TypeScript package (needs special Nest build set-up); project references |
| E01-D3 | The API is CommonJS, built by the Nest CLI with SWC; type checking is a separate `tsc --noEmit` | Fast builds; the standard Nest set-up; TypeORM migrations work out of the box | ESM Nest (TypeORM and migration loading are awkward) |
| E01-D4 | The test database is reset only by `prepare-test-db`, which checks it is `labsafe_test` on 5443 | Can never wipe the development database (root CLAUDE.md hard rule) | Manual SQL; a reset inside each test |
| E01-D5 | Integration tests run one file at a time against one migrated schema, with tables emptied per file | Real constraints and transactions are tested; simple and deterministic | A database per worker (more set-up); mocking the repositories (misses constraint bugs) |
| E01-D6 | Configuration is read from `process.env`, checked by Zod, with `.env` loaded by `node --env-file-if-exists` | No extra libraries; fails fast on mistakes | `@nestjs/config` with dotenv |
| E01-D7 | Fixed lists are `{ value, label }` constants with upper-case codes | Stable values for the database and URLs; English labels in one place | Plain strings; database tables |

## 12. Risks

- **Docker Hub may be unreachable.** Mitigation: `postgres:15` is already local, and `pull_policy: missing` avoids pulling.
- **pnpm 11 blocks native builds** (`@swc/core`, `esbuild`) until approved. Mitigation: list them in `allowBuilds:`; the developer approves exactly what pnpm reports.
- **Playwright's Chromium** must be installed once: `pnpm exec playwright install chromium`.
- **`pnpm verify` needs the test database running** (`pnpm db:up`). Mitigation: `test:int` checks the connection first and prints "run `pnpm db:up`" instead of a long stack trace.

## 13. Story outline

1. **S01.1 Workspace, API skeleton and quality gate.**
   - Delivers: the pnpm workspace, the shared package (lists, error codes, health schema), the Nest app with config, error filter, Zod pipe and `GET /api/health`, Docker Compose with `pnpm db:up`, the migration set-up with the `lab_rooms` migration, the API integration-test harness, `pnpm verify` and `pnpm typecheck`, and `apps/api/CLAUDE.md`.
   - Try it: `pnpm db:up`, then `pnpm verify` passes, and `curl localhost:3000/api/health` returns ok.
   - Depends on: none.
2. **S01.2 Web app shell and home page.**
   - Delivers: `GET /api/meta/lists`; the Vite/React app with the shell, the home page (all states) and the not-found page; web component tests; `pnpm dev`; `apps/web/CLAUDE.md`.
   - Try it: `pnpm dev`, then open `localhost:5173` and see the rooms and hazard types, also on a phone-sized window.
   - Depends on: S01.1.
3. **S01.3 One-origin test server and end-to-end tests.**
   - Delivers: Nest serving the built web app; `prepare-test-db` with its guard; Playwright with desktop and 375 px projects; the smoke tests (home, not found, no horizontal scroll); `pnpm e2e` and `pnpm qa:serve`.
   - Try it: `pnpm qa:serve`, then open `localhost:4100`; `pnpm e2e` passes.
   - Depends on: S01.2.

## 14. Open questions

- None. The placeholder lab-room names can be edited in the migration before E01 is merged, if the user already knows the real rooms.

## 15. Changes

*(none yet)*
