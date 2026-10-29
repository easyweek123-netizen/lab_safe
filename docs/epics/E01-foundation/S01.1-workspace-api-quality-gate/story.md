---
id: S01.1
epic: E01
title: Workspace, API skeleton and quality gate
type: feature
status: done
covers: []
updated: 2026-10-29
---

# S01.1 Workspace, API skeleton and quality gate

**As** the developer **I want** a pnpm workspace with the shared contract package, a tested NestJS skeleton, both databases and one quality-gate command, **so that** every later story only adds features. · Design: [design.md](../design.md) (sections 1–7, 10, 11)

This story covers no PRD requirement directly; it is the base for NFR6 and NFR2, which S01.2 and S01.3 cover. **No role is refused in this story:** every E01 endpoint is public (design §9); E02 adds the deny-by-default guard.

**Try it:** `pnpm db:up` → `pnpm verify` passes → `pnpm db:migrate` (asks the user first) → `pnpm dev` → `curl localhost:3000/api/health` returns ok.

## Acceptance criteria

- **AC1** Given a fresh clone on Node 24 and pnpm 11, When the developer runs `pnpm install` and then `pnpm typecheck`, Then the install finishes with every native build approved in `pnpm-workspace.yaml`, and the type check passes in every package.
- **AC2** Given the package `@labsafe/shared`, When code imports it, Then it provides the fixed lists of PRD §4.2 (hazard types, protective equipment, GHS pictograms, categories) and the hazard levels as `{ value, label }` items with unique upper-case values and the PRD's English labels, plus `HazardLevel`, `ErrorCode`, `ErrorResponse` and `HealthResponse`.
- **AC3** Given Docker with the local `postgres:15` image, When the developer runs `pnpm db:up`, Then the development database answers on port 5442 and `labsafe_test` on port 5443, both report healthy, and no image is pulled.
- **AC4** Given a running API with a reachable database, When an anonymous visitor calls `GET /api/health`, Then the response is 200 with `{ "status": "ok", "database": "ok" }`.
- **AC5** Given the database is unreachable, When anyone calls `GET /api/health`, Then the response is 503 with code `SERVICE_UNAVAILABLE` in the shared error format.
- **AC6** Given any request, When it targets an unknown `/api` path or the server throws an unexpected error, Then the response uses the shared error format: 404 `NOT_FOUND` for the unknown path, and 500 `INTERNAL_ERROR` with a generic message and no stack trace or internal detail for the unexpected error.
- **AC7** Given a missing or invalid setting (for example no `DATABASE_URL`, or `PORT=abc`), When the API starts, Then it stops with exit code 1 and one message that names every bad setting; given valid settings without `PORT`, Then it uses port 3000.
- **AC8** Given a handler input parsed with `ZodValidationPipe(schema)`, When the input does not match the schema, Then the response is 400 `VALIDATION_FAILED` with a `fields` list naming every invalid path; When it matches, Then the handler receives the parsed value.
- **AC9** Given an empty database, When the migrations run, Then the table `lab_rooms` exists with a unique, non-empty `code` and a non-empty `name`, and it contains the four placeholder rooms.
- **AC10** Given any database URL other than database `labsafe_test` on port 5443, When `prepare-test-db` runs, Then it refuses before connecting and changes nothing; given the test URL, Then it drops and recreates the `public` schema and runs every migration; given the test database is not running, Then it stops with "run `pnpm db:up`" instead of a stack trace.
- **AC11** Given the test database is running, When the developer runs `pnpm verify`, Then it runs format check, lint, type check, unit tests, API integration tests, build and docs check in that order, stops at the first failure, and passes on a clean tree.
- **AC12** Given a developer agent starts a backend ticket, When it opens `apps/api/CLAUDE.md`, Then it finds every rule listed for that file in design §10.

## Test cases

| TC      | AC   | Role      | Preconditions / data | Steps | Expected | Type | Ticket |
| ------- | ---- | --------- | -------------------- | ----- | -------- | ---- | ------ |
| TC-1.1  | AC1  | developer | Fresh clone; Node 24; pnpm 11 | 1. `pnpm install` 2. `pnpm typecheck` | No "ignored build scripts" warning; type check exits 0 for shared and api | manual | — |
| TC-2.1  | AC2  | —         | The list constants | 1. Import every list 2. Check counts, labels, values | Counts 15 / 14 / 9 / 8 / 3; labels equal PRD §4.2 word for word; every value is unique in its list and matches `^[A-Z][A-Z0-9_]*$` | auto: unit | BE-01 |
| TC-2.2  | AC2  | —         | Sample objects | 1. Parse with `HealthResponse` and `ErrorResponse` | `HealthResponse` accepts `{status:"ok",database:"ok"}`, rejects `{status:"down"}`; `ErrorResponse` accepts a body with and without `fields`, rejects an unknown `code` | auto: unit | BE-01 |
| TC-3.1  | AC3  | developer | Docker running; no LabSafe containers | 1. `pnpm db:up` (user approves) 2. `docker compose ps` | `db` on 5442 and `db-test` on 5443, both `healthy`; no image pulled | manual | — |
| TC-4.1  | AC4  | anonymous | Test database migrated | 1. `GET /api/health` with no cookie | 200; body parses with `HealthResponse` | auto: api | BE-05 |
| TC-4.2  | AC4  | developer | Dev database up and migrated; `.env` has the values of `.env.example` | 1. `pnpm dev` 2. `curl localhost:3000/api/health` | `{"status":"ok","database":"ok"}` | manual | — |
| TC-5.1  | AC5  | —         | `HealthService` with a `DataSource` whose `query` rejects | 1. Call `check()` | Throws `AppException` with status 503 and code `SERVICE_UNAVAILABLE` | auto: unit | BE-05 |
| TC-5.2  | AC5  | anonymous | Test app; `DataSource.query` mocked to reject once | 1. `GET /api/health` | 503; body parses with `ErrorResponse`, code `SERVICE_UNAVAILABLE` | auto: api | BE-05 |
| TC-6.1  | AC6  | anonymous | Test app | 1. `GET /api/does-not-exist` | 404; body `{ statusCode: 404, code: "NOT_FOUND", message }` parses with `ErrorResponse` | auto: api | BE-05 |
| TC-6.2  | AC6  | —         | `ErrorFilter`; `new Error("secret db detail")` | 1. Call `catch` with a fake host | 500, code `INTERNAL_ERROR`, message `Something went wrong.`; the body contains neither `secret db detail` nor a stack line | auto: unit | BE-03 |
| TC-6.3  | AC6  | —         | `ErrorFilter`; an `AppException(503, SERVICE_UNAVAILABLE, …)`, a Nest `NotFoundException` and a Nest `BadRequestException` | 1. Call `catch` for each | The `AppException` passes through unchanged; `NotFoundException` → 404 `NOT_FOUND`; `BadRequestException` → 400 `VALIDATION_FAILED` | auto: unit | BE-03 |
| TC-7.1  | AC7  | —         | Env without `DATABASE_URL` | 1. `loadConfig(env)` | Throws `ConfigError`; message names `DATABASE_URL` | auto: unit | BE-02 |
| TC-7.2  | AC7  | —         | Env with `PORT=abc`, `NODE_ENV=staging` and a valid `DATABASE_URL` | 1. `loadConfig(env)` | One `ConfigError` naming both `PORT` and `NODE_ENV` | auto: unit | BE-02 |
| TC-7.3  | AC7  | —         | Env with only a valid `DATABASE_URL` | 1. `loadConfig(env)` | `PORT` 3000, `NODE_ENV` `development`, `WEB_DIST_DIR` undefined | auto: unit | BE-02 |
| TC-7.4  | AC7  | developer | API built | 1. `env -u DATABASE_URL node apps/api/dist/main.js` | Exit code 1; one readable line naming `DATABASE_URL`; no stack trace | manual | — |
| TC-8.1  | AC8  | —         | Pipe with `z.object({ name: z.string().min(1), count: z.number() })` | 1. `transform({ name: "", count: "x" })` | Throws `AppException` 400 `VALIDATION_FAILED`; `fields` has paths `name` and `count` | auto: unit | BE-03 |
| TC-8.2  | AC8  | —         | Same pipe | 1. `transform({ name: "a", count: 1, extra: true })` | Returns `{ name: "a", count: 1 }` | auto: unit | BE-03 |
| TC-9.1  | AC9  | —         | Test database prepared by the integration `globalSetup` | 1. `SELECT code, name FROM lab_rooms ORDER BY code` | Exactly the four placeholder rooms of [BE-04](be/BE-04-databases-migration-guard.md) | auto: api | BE-05 |
| TC-9.2  | AC9  | —         | Same | 1. Insert a room with code `LAB-101` 2. Insert a room with code `''` | Both rejected (unique violation `23505`, check violation `23514`) | auto: api | BE-05 |
| TC-10.1 | AC10 | —         | URLs: dev `…:5442/labsafe`; `…:5443/labsafe`; `…:5442/labsafe_test`; `not a url` | 1. `assertTestDatabase(url)` for each | Each throws; the message names database `labsafe_test` and port 5443 | auto: unit | BE-04 |
| TC-10.2 | AC10 | —         | `postgres://labsafe:labsafe@localhost:5443/labsafe_test` | 1. `assertTestDatabase(url)` | Does not throw | auto: unit | BE-04 |
| TC-10.3 | AC10 | developer | Test database up | 1. `pnpm test:db:prepare` (user approves) 2. Run it again | Both succeed; `lab_rooms` has 4 rows, not 8 | manual | — |
| TC-10.4 | AC10 | developer | Test database stopped (`pnpm db:down`) | 1. `pnpm test:int` | Stops with a message telling to run `pnpm db:up`; no stack trace | manual | — |
| TC-11.1 | AC11 | developer | Test database running; clean tree | 1. `pnpm verify` | The seven steps run in the stated order; exit 0 | manual | — |
| TC-11.2 | AC11 | developer | One badly formatted line added to a `.ts` file | 1. `pnpm verify` 2. Undo the change | Stops at the format check with a non-zero exit; lint and later steps do not run | manual | — |
| TC-12.1 | AC12 | user      | — | 1. Read `apps/api/CLAUDE.md` | Every bullet of design §10 for `apps/api/CLAUDE.md` is there | manual | — |

## API contract

Shared schemas (`packages/shared/src`, exported from `src/index.ts`). Each schema and its inferred type share one name (`export const HealthResponse = z.object(…)` and `export type HealthResponse = z.infer<typeof HealthResponse>`).

- `errors.ts`: `ErrorCode` = `z.enum(["VALIDATION_FAILED", "NOT_FOUND", "SERVICE_UNAVAILABLE", "INTERNAL_ERROR"])` (later epics add their codes from design doc §8); `FieldError { path: string, message: string }`; `ErrorResponse { statusCode: int, code: ErrorCode, message: string, fields?: FieldError[] }`.
- `schemas/health.ts`: `HealthResponse { status: "ok", database: "ok" }` (both literals).
- `lists.ts`: `HAZARD_TYPES`, `PROTECTIVE_EQUIPMENT`, `HAZARD_PICTOGRAMS`, `CATEGORIES`, `HAZARD_LEVELS` (each `as const` arrays of `{ value, label }`), the value unions `HazardTypeValue`, `ProtectiveEquipmentValue`, `HazardPictogramValue`, `CategoryValue`, and `HazardLevel` = `z.enum(["LOW", "MEDIUM", "HIGH"])`. Exact values in [BE-01](be/BE-01-workspace-shared-contract.md).

| Method | Path | Auth | Request → Response | Status codes |
| ------ | ---- | ---- | ------------------ | ------------ |
| GET | /api/health | Public | none → `HealthResponse` | 200; 503 `SERVICE_UNAVAILABLE` |
| any | `/api/<unknown>` | Public | none → `ErrorResponse` | 404 `NOT_FOUND` |
| any | any `/api` path | Public | unexpected server error → `ErrorResponse` | 500 `INTERNAL_ERROR` (generic message, no details) |

## UI states

None; this story has no screens.

## Tickets

In build order (BE first; the first BE ticket implements the contract):

1. [BE-01 Workspace and shared contract package](be/BE-01-workspace-shared-contract.md)
2. [BE-02 API skeleton and configuration](be/BE-02-api-skeleton-config.md)
3. [BE-03 Error format and validation pipe](be/BE-03-error-format-validation.md)
4. [BE-04 Databases, lab rooms migration and test-database guard](be/BE-04-databases-migration-guard.md)
5. [BE-05 Integration-test harness and health endpoint](be/BE-05-integration-tests-health.md)
6. [BE-06 Quality gate and API coding rules](be/BE-06-quality-gate-api-rules.md)

## Out of scope

- The web app, `GET /api/meta/lists` and the `MetaListsResponse` schema (S01.2).
- Serving the built web app, `pnpm e2e`, `pnpm qa:serve`, Playwright (S01.3). `prepare-test-db` is built here because the integration tests need it; S01.3 reuses it.
- Guards, sessions and every error code other than the four above (E02 onwards).
- Tables other than `lab_rooms`; CHECK constraints for the fixed lists (E03).

## Known gaps

Unticked by the user on 2026-10-29 (accepted, not fixed). Full text in [review.md](review.md) and [qa.md](qa.md).

- F1 [minor][be] The test-database guard checks only the URL name and port; `?host=`/`?port=` query parameters or another host could still pass it.
- F3 [minor][be] When `/api/health` answers 503, the database error is not logged.
- F4 [minor][be] If the database is down at start-up, the API dies after about 30 s with a stack trace instead of one clear message.
- F5 [minor][docs] TC-10.4 had no automated check; it was run by hand in QA run 1 (passed).
- F6 [minor][docs] E01 design §5/§6 lag behind the code (typecheck builds shared first, `.mts` Vitest configs, `--configLoader runner`, `../../.env`); left for `/eod`.
- F7 [minor][docs] `apps/api/CLAUDE.md` tells developers to call `resetTables()`, but `test/setup-file.ts` already does before each file.
- F8 [minor][be] The error filter trusts a numeric 4xx `status`/`statusCode` on any error object (relevant once E07 calls the LLM provider).
- B1 [minor][be] With the test database stopped, `pnpm test:int` prints misleading "No test files found" and "Unhandled Error" lines before the `pnpm db:up` message.
- B3 [minor][be] The Playwright browser tools leave `.playwright-mcp/` in the repository root, which is in neither `.gitignore` nor `.prettierignore`, so `pnpm verify` fails until it is deleted.

## Verification

**GREEN** · 2026-10-29

- **1. Acceptance criteria, each implemented as written:**
  - AC1: `pnpm-workspace.yaml:6-8` (`allowBuilds` has exactly `@swc/core` and `esbuild`); `package.json:13` (`typecheck`); QA run 1 TC-1.1 (fresh install, no ignored-build warning, typecheck exit 0).
  - AC2: `packages/shared/src/lists.ts:6-76` (five `as const` lists, in PRD §4.2 order with its labels word for word, plus `HazardLevel` and the value unions); `errors.ts:6-27`; `schemas/health.ts:3-7`; `index.ts:1-3`.
  - AC3: `package.json:19`; `docker-compose.yml:7-22` (`db` on 5442), `:25-40` (`db-test` `labsafe_test` on 5443, tmpfs), `pull_policy: missing` at `:9` and `:27`, `pg_isready` checks; QA run 1 TC-3.1.
  - AC4: `apps/api/src/modules/health/health.controller.ts:14-17`, `health.service.ts:11-18`; `test/health.int.test.ts:23`.
  - AC5: `health.service.ts:14-15` (503 `SERVICE_UNAVAILABLE`); `health.service.test.ts:11`; `test/health.int.test.ts:31`.
  - AC6: `src/common/error.filter.ts:61-62` (404 `NOT_FOUND`) and `:73-77` (500 `INTERNAL_ERROR`, a generic message, logged only on the server); `src/app.setup.ts:6-7`; `test/foundation.int.test.ts:45`; `error.filter.test.ts:54`.
  - AC7: `src/common/config.ts:4-21` (default `PORT` 3000) and `:36-47` (one `ConfigError` that names every bad setting); `src/main.ts:7-18` (exit 1, no stack trace); QA run 1 TC-7.4.
  - AC8: `src/common/zod-validation.pipe.ts:16-27`; `zod-validation.pipe.test.ts:19,40`.
  - AC9: `src/db/migrations/1793232000000-CreateLabRooms.ts:13-25`; `test/foundation.int.test.ts:73,86,97`.
  - AC10: `scripts/test-db-guard.ts:15-38`; `scripts/prepare-test-db.ts:29` (guard runs before `initialize` at `:33`), `:40-42` (drop, create, migrate), `:35` and `:53-57` (prints only the "run `pnpm db:up`" message); `test/global-setup.ts:8-12`; QA run 2 TC-10.3 and run 1 TC-10.4.
  - AC11: `package.json:24` (the seven steps joined with `&&`, in the stated order); QA run 2 TC-11.1 and run 1 TC-11.2.
  - AC12: `apps/api/CLAUDE.md` covers every point of design §10:
    - module layout: `:7`
    - Zod pipe: `:8`
    - mapped output: `:9`
    - `ErrorCode` through the filter: `:10`
    - migrations, `synchronize` and destructive commands: `:15-18`
    - `createTestApp`/`resetTables` and test names: `:24-25`
    - database approval: `:19`
- **Automated test cases:** every one has a passing test whose title starts with its identifier:
  - TC-2.1 and TC-2.2: `packages/shared/src/shared.test.ts:91,99,105,113,118,133`
  - TC-4.1 and TC-5.2: `test/health.int.test.ts:23,31,46`
  - TC-5.1: `health.service.test.ts:11,24`
  - TC-6.1, TC-9.1 and TC-9.2: `test/foundation.int.test.ts:45,73,86-116`
  - TC-6.2 and TC-6.3: `error.filter.test.ts:54,71,83,97,113,120`
  - TC-7.1 to TC-7.3: `config.test.ts:17,23,29,38,46,53`
  - TC-8.1 and TC-8.2: `zod-validation.pipe.test.ts:19,31,40`
  - TC-10.1 and TC-10.2: `scripts/test-db-guard.test.ts:22,38,51`

  QA run 2 is PASS. No role is refused in this story (design §9), so no refusal tests are needed.
- **2. Contract:**
  - `HealthResponse` has two literals (`schemas/health.ts:3-6`).
  - `ErrorResponse` and `FieldError` match the contract (`errors.ts:15-26`).
  - `GET /api/health` is public and has no guard (`health.controller.ts:5-9`).
  - An unknown `/api` path gives 404 `ErrorResponse`, and an unexpected error gives 500 `ErrorResponse`.
  - The only difference is a fifth `ErrorCode`, `REQUEST_REJECTED` (`errors.ts:9`, `error.filter.ts:67-72`). It comes from the F2 fix that the user ticked, and it is recorded in the BE-03 implementation notes. The user deferred reconciling it to `/eod`.
- **3. Tables and migrations match E01 design §3:**
  - The one hand-written `CreateLabRooms` migration has `uuid` PK `gen_random_uuid()`, `code` unique and not empty, `name` not empty, and the four placeholder rooms with a PRD §7 comment (`1793232000000-CreateLabRooms.ts:3-25`).
  - It is listed explicitly in `src/db/migrations/index.ts:8`.
  - `synchronize: false` is set in `src/db/data-source.ts:17`.
- **4. Data rules enforced where the design says:**
  - Unique, non-empty code and non-empty name: database constraints (`CreateLabRooms.ts:15-16`), proven by TC-9.2.
  - Only `labsafe_test` on 5443 may be reset (E01-D4):
    - the guard runs before any connection (`prepare-test-db.ts:29`);
    - it reads no environment variable (`prepare-test-db.ts:28`);
    - the test helpers are guarded too (`test/helpers.ts:20,36`);
    - the integration env is pinned to the test URL (`vitest.int.config.mts:25`).
  - Fixed lists are constants, not tables (`lists.ts`).
- **5. Layering:**
  - The controller is thin and only calls the service (`health.controller.ts:15-17`). The service holds the rule and throws `AppException` (`health.service.ts:11-18`).
  - Configuration goes only through `loadConfig` and `APP_CONFIG` (`app.module.ts:10-24`, `main.ts:21-22`).
  - `main.ts` and the tests share one app set-up (`app.setup.ts:5-8`, `test/helpers.ts:22-27`).
  - Unit tests sit next to the code; integration tests are in `test/*.int.test.ts` (design §6, `apps/api/CLAUDE.md:23-24`).
- **6. Nothing built beyond the story:**
  - There is no `apps/web`, no `e2e/`, no `GET /api/meta/lists` and no `MetaListsResponse`.
  - The only tables are `lab_rooms` and `migrations`.
  - Extras:
    - the ticked F2 mapping;
    - the `db:generate` script (BE-04 step 5);
    - the guard error classes (BE-04 notes);
    - `.mcp.json` in `.prettierignore` (BE-06 notes);
    - extra assertions under existing TC and AC titles.
  - All of these are recorded and within scope.
- **7. Differences are recorded:** all are in the ticket notes, and the user deferred design reconciliation to `/eod`:
  - `REQUEST_REJECTED`, which is not in the story contract or design doc §8: BE-03 notes.
  - `typecheck` builds shared first: BE-01 deviation 1.
  - tsup `ignoreDeprecations`: BE-01 deviation 2.
  - Vitest configs are `.mts`: BE-02 deviation 1, and BE-05.
  - The `nest-cli` builder is in object form: BE-02 deviation 2.
  - `dev` loads `../../.env`, and `dev` has no `-n` (B2 fix): BE-02 notes.
  - `--configLoader runner`, the guarded `createTestApp`, and the rolled-back TC-9.2 inserts: BE-05 differences.
  - `prepare-test-db` is built in S01.1 rather than S01.3: this story's "Out of scope" and BE-04.

  Accepted and left open by the user: review F1 and F3 to F8, and QA B1 and B3. `pnpm e2e` is not available yet (S01.3).

## Changes
