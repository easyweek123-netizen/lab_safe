---
id: BE-05
story: S01.1
layer: be
status: done
depends_on: [BE-04]
covers: [AC4, AC5, AC6, AC9]
updated: 2026-10-29
---

# BE-05 Integration-test harness and health endpoint

**Goal:** connect the Nest app to PostgreSQL, add `GET /api/health`, and set up the API integration tests that run against `labsafe_test`. **Automates:** TC-4.1, TC-5.1, TC-5.2, TC-6.1, TC-9.1, TC-9.2. **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- change `apps/api/src/app.module.ts`, `apps/api/package.json`, `package.json` (root `test:int`)
- create `apps/api/src/modules/health/health.module.ts`, `health.controller.ts`, `health.service.ts`, `health.service.test.ts`
- create `apps/api/vitest.int.config.mts`, `apps/api/test/global-setup.ts`, `apps/api/test/setup-file.ts`, `apps/api/test/helpers.ts`
- create `apps/api/test/health.int.test.ts`, `apps/api/test/foundation.int.test.ts`

## Approach

1. **TypeORM in the app:** in `AppModule.forRoot(config)`, import `TypeOrmModule.forRoot({ ...dataSourceOptions(config.DATABASE_URL), autoLoadEntities: true })` (from `src/db/data-source.ts`, BE-04). Migrations never run at start-up in E01; `synchronize` stays `false`.
2. **Health module** (layering from design doc §2: controller → service, thin controller). `HealthController` has `@Get('health')`, which becomes `/api/health` through the global prefix. It returns `healthService.check()`. `HealthService.check(): Promise<HealthResponse>` runs `SELECT 1` on the injected `DataSource` and returns `{ status: 'ok', database: 'ok' }`. If the query fails, it throws `AppException(503, 'SERVICE_UNAVAILABLE', 'The database is unreachable.')`. Add a comment that the route is public (design §9); E02's guard will need `@Public()` here.
3. **`health.service.test.ts`:** TC-5.1, with a fake `DataSource` (`{ query: vi.fn().mockRejectedValue(…) }`); no database.
4. **`vitest.int.config.mts`** (design §6, E01-D5): the same SWC plugin and `@labsafe/shared` alias as `vitest.config.mts`; `include: ['test/**/*.int.test.ts']`; `fileParallelism: false`; `globalSetup: ['test/global-setup.ts']`; `setupFiles: ['test/setup-file.ts']`; `env: { NODE_ENV: 'test', DATABASE_URL: TEST_DATABASE_URL }` (import the constant from `scripts/test-db-guard.ts`). API script `test:int`: `vitest run -c vitest.int.config.mts`; root script `test:int`: `pnpm --filter @labsafe/api test:int`.
5. **`test/global-setup.ts`:** call `prepareTestDb()` (BE-04) once. If it throws the "not running" error, rethrow only its message so the run ends with "run `pnpm db:up`" and no stack trace (design §12, TC-10.4).
6. **`test/helpers.ts`:**
   - `createTestApp(env: Record<string, string> = {})` builds `AppModule.forRoot(loadConfig({ ...process.env, ...env }))` with `@nestjs/testing`, calls `configureApp(app)` (BE-03) and `app.init()`, and returns the app. S01.3 passes `WEB_DIST_DIR` through `env`.
   - `resetTables()` opens a short `pg` client on `TEST_DATABASE_URL` and empties (`TRUNCATE … RESTART IDENTITY CASCADE`) every table in `public` except `lab_rooms` and `migrations`. It does nothing when there are no such tables (as in E01).
   `test/setup-file.ts` calls `resetTables()` in `beforeAll`, so every file starts with clean tables.
7. **`test/health.int.test.ts`:** TC-4.1, and TC-5.2 with `vi.spyOn(app.get(DataSource), 'query').mockRejectedValueOnce(new Error('connection refused'))`. Use Supertest 7 on `app.getHttpServer()`, and check every body with the shared schema (`HealthResponse.parse`, `ErrorResponse.parse`). Close the app in `afterAll`.
8. **`test/foundation.int.test.ts`:** TC-6.1 (`GET /api/does-not-exist`); TC-9.1 and TC-9.2 through `app.get(DataSource).query(…)`, checking the Postgres error codes `23505` and `23514`.
9. Titles start with the TC identifier, for example `it('TC-4.1 returns ok for an anonymous visitor', …)`.
10. **Proof of work:** `pnpm --filter @labsafe/api test`, `pnpm test:int` (it uses only `labsafe_test`; the test database must be running, which BE-04 started with the user's approval), `pnpm typecheck`, `pnpm build`. By hand, if the user agrees to migrate the development database: `pnpm dev` and then `curl localhost:3000/api/health` (TC-4.2).

## Out of scope

Lint, format and `pnpm verify` (BE-06). `GET /api/meta/lists` and the `LabRoom` entity (S01.2). Guards (E02).

## Implementation notes

- **App:** `AppModule.forRoot(config)` imports `TypeOrmModule.forRoot({ ...dataSourceOptions(config.DATABASE_URL), autoLoadEntities: true })` and `HealthModule`. No migrations run at start-up; `synchronize` stays `false` (from `dataSourceOptions`).
- **Health module** (`apps/api/src/modules/health/`): `HealthController` (`@Get('health')` on a `@Controller()` with no path, so `/api/health` through the global prefix; a comment says the route is public and needs `@Public()` once E02 adds its guard) → `HealthService.check()`, which runs `SELECT 1` on the injected `DataSource`. Any failure becomes `AppException(503, 'SERVICE_UNAVAILABLE', 'The database is unreachable.')`; the database error message is not passed on. The endpoint takes no input, so there is nothing to validate.
- **Integration harness:** `apps/api/vitest.int.config.mts` as in step 4. `test/global-setup.ts` calls `prepareTestDb()` and rethrows a `TestDatabaseNotRunningError` as a plain `Error` whose `stack` is only the message. `test/helpers.ts` has `createTestApp(env)` and `resetTables()`; `test/setup-file.ts` calls `resetTables()` in `beforeAll`. `resetTables()` lists the tables in `public` other than `lab_rooms` and `migrations` with one query and truncates them all in one `TRUNCATE … RESTART IDENTITY CASCADE`; with no such table (E01) it runs nothing else.
- **Scripts:** API `test:int` is `vitest run -c vitest.int.config.mts --configLoader runner`; root `test:int` is `pnpm --filter @labsafe/api test:int`. `apps/api/tsconfig.json` now also includes `test` and `vitest.int.config.mts`, so `pnpm typecheck` checks them.
- **Dependencies:** dev dependencies `supertest` ^7.3.1 and `@types/supertest` ^7.2.1 (the ticket names Supertest 7, which was not installed yet). No native build.
- **Tests:**
  - `src/modules/health/health.service.test.ts`: TC-5.1 (503 `SERVICE_UNAVAILABLE` from a fake `DataSource`), TC-5.1 (the database message is not passed on), and one extra `AC4 …` test for the ok path with `SELECT 1`.
  - `test/health.int.test.ts`: TC-4.1 (200, body parses with `HealthResponse`, no cookie set), TC-5.2 (503, body parses with `ErrorResponse`, no `connection refused` in it), and TC-5.2 (the next call answers 200 again, so the mock only fails once).
  - `test/foundation.int.test.ts`: TC-6.1 (`GET /api/does-not-exist` → 404 JSON `{ statusCode: 404, code: "NOT_FOUND", message: "Not found." }`), TC-9.1 (exactly the four rooms), TC-9.2 (duplicate `LAB-101` → `23505`; code `''` → `23514`; also name `''` → `23514`; afterwards still 4 rooms).
- **Proof of work:**
  - `pnpm --filter @labsafe/api test`: 35 passed.
  - `pnpm test:int`: 2 files, 9 passed, against `labsafe_test` only.
  - `pnpm typecheck` and `pnpm build`: exit 0.
  - With the user's approval: `pnpm db:migrate` on the development database ran `CreateLabRooms1793232000000`. Then TC-4.2: `pnpm dev`, and `curl localhost:3000/api/health` returned `{"status":"ok","database":"ok"}` with status 200. The dev server was stopped afterwards.
  - TC-10.4 (manual, test database stopped) was not run, because stopping the database needs the user's approval and is not part of this ticket.
- **Differences from the ticket:**
  - `--configLoader runner` in the API `test:int` script. Vite's default config loader warned about the CommonJS `scripts/test-db-guard.ts` that step 4 imports into the `.mts` config; the runner loader loads it without the warning. The config imports `./scripts/test-db-guard.js` (the `.js` extension that NodeNext needs).
  - `createTestApp` also calls `assertTestDatabase(config.DATABASE_URL)`, so a test app can never write to a database other than `labsafe_test`, even if the `env` argument sets another `DATABASE_URL`. `resetTables` calls the guard too. The app logs only errors and warnings in tests.
  - TC-9.2 runs each insert through a query runner of `app.get(DataSource)` inside a transaction that is always rolled back, instead of a bare `app.get(DataSource).query(…)`. If a constraint were missing, the test would fail without adding a row to `lab_rooms`, which `resetTables` keeps.
  - Extra tests beyond the listed test cases: the `AC4` unit test, the second TC-5.1 and TC-5.2 tests, and the TC-9.2 name and row-count checks.
- **Migrations:** none added.
