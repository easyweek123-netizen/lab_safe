# API coding rules (`apps/api`)

NestJS 11, TypeORM 0.3 on PostgreSQL 15, Zod 4 from `@labsafe/shared`, CommonJS built by the Nest CLI with SWC. Design: `docs/technical-design/design-doc.md` and `docs/epics/E01-foundation/design.md`.

## Code layout

- **Modules:** one folder per feature, `src/modules/<name>/`, with `<name>.module.ts`, a thin `<name>.controller.ts` (HTTP only: parse the input, call the service, return its result), a `<name>.service.ts` (business rules and transactions) and TypeORM repositories that only services use. Controllers never touch a repository.
- **Input:** every input (body, params, query) is parsed with a shared Zod schema from `@labsafe/shared` through `new ZodValidationPipe(schema)` (`src/common/zod-validation.pipe.ts`). A mismatch becomes 400 `VALIDATION_FAILED` with a `fields` list.
- **Output:** return mapped objects that match the shared response schema, never TypeORM entities.
- **Errors:** throw `AppException(status, code, message, fields?)` (`src/common/app.exception.ts`) with an `ErrorCode`; the global `ErrorFilter` (`src/common/error.filter.ts`) formats every error as `ErrorResponse` and never leaks details. A new code goes in `packages/shared/src/errors.ts` and in the filter.
- **Configuration:** read settings only through `loadConfig()` and the injected `APP_CONFIG` (`src/common/config.ts`), never from `process.env` directly. A new setting goes in the schema in `config.ts` and in `.env.example`.

## Database

- **Migrations:** generate with `pnpm --filter @labsafe/api db:generate src/db/migrations/<Name>`, read every line, keep it, and append the class to `ALL_MIGRATIONS` in `src/db/migrations/index.ts`.
- **Never `synchronize`.** Schema changes happen only through migration files.
- **Never edit a migration that is already on `master`;** add a new one instead.
- **Destructive commands only on `labsafe_test` (port 5443), and only through `prepare-test-db`** (`scripts/prepare-test-db.ts`), whose guard refuses any other database.
- **Database commands need the user's approval:** `pnpm db:up`, `pnpm db:migrate`, `db:generate`, `pnpm test:db:prepare` and any SQL. Ask and wait for a clear yes. The only exceptions are `pnpm verify` and `pnpm e2e`, which use only `labsafe_test`.

## Tests

- **Unit tests:** `*.test.ts` next to the code. No database.
- **Integration tests:** `test/*.int.test.ts`, against the real app built by `createTestApp()` and called with Supertest; call `resetTables()` before each file (both in `test/helpers.ts`).
- **Names:** every test title starts with its test-case identifier, for example `it('TC-2.1 refuses a non-admin with 403', …)`.
- **Every endpoint needs** at least one successful call, one invalid input, and a 401 or 403 test for each role that must be refused.

## Commands

- `pnpm --filter @labsafe/api test`: the API unit tests.
- `pnpm test:int`: the API integration tests (needs the test database: `pnpm db:up`).
- `pnpm verify`: the whole quality gate (format check, lint, type check, unit tests, integration tests, build, docs check). It must pass before a ticket is done.
