# API coding rules (`apps/api`)

NestJS 11, TypeORM 0.3, PostgreSQL 15, Zod 4 from `@labsafe/shared`. Built with the Nest CLI and SWC.

## Layout

```
src/
  main.ts · app.module.ts
  common/              config, error filter, validation pipe, AppException, guards
  db/                  data-source.ts, migrations/
  modules/<name>/      <name>.module.ts, <name>.controller.ts, <name>.service.ts, <name>.entity.ts
test/
  unit/                unit tests, mirroring src/ (test/unit/common/config.test.ts)
  *.int.test.ts        integration tests against the real app and labsafe_test
  helpers.ts, setup-file.ts, global-setup.ts, fixtures/
```

All tests live in `test/`. There are no test files in `src/` or `scripts/`.

## Coding rules

- **One module per feature.** A module exports only the services other modules need. No circular imports, no `forwardRef`.
- **Controllers are thin:** parse the input, call one service method, return its result. They never touch a repository or contain a rule.
- **Services hold the rules.** Inject dependencies through the constructor as `private readonly`. Inject repositories with `@InjectRepository(Entity)`.
- **Input:** every body, param and query is parsed with a shared Zod schema through `new ZodValidationPipe(schema)`. No class-validator, no hand-written checks.
- **Output:** map entities to the shared response schema with a `to<Name>Response()` function. Never return an entity.
- **Access:** every route declares who may call it. Anything without a declaration is refused.
- **Transactions:** a change that touches several rows runs inside `dataSource.transaction(async (manager) => …)`, using `manager` for every query in it.
- **Errors:** throw `AppException(status, code, message)` with an `ErrorCode` from `packages/shared/src/errors.ts`. Never throw a plain `Error` or string for a client error. Never swallow an error in an empty `catch`.
- **Configuration:** only through the injected `APP_CONFIG` (`src/common/config.ts`), never `process.env`.
- **Logging:** `private readonly logger = new Logger(<Class>.name)`. No `console.log`. Never log passwords, tokens or personal data.
- **Queries:** no query inside a loop; load related rows with a join. A column used in `WHERE` gets an index in the migration.
- **Entities:** UUID primary keys, snake_case column names, `created_at` and `updated_at` columns.
- **TypeScript:** no `any`; use the types from `@labsafe/shared`. `async`/`await` everywhere; no promise left unawaited.
- **Files:** `<name>.<kind>.ts` in kebab case; one class per file.

## Database

- **Migrations:** change the entities, then `pnpm --filter @labsafe/api db:generate src/db/migrations/<Name>`. It needs the development database up to date and the user's approval. Read every line, check that `down` undoes it, and add it to `ALL_MIGRATIONS` in `src/db/migrations/index.ts`. The user approves the file before `pnpm db:migrate` runs it.
- Never `synchronize`. Never edit a migration that is already on `master`.
- Deleting data only on `labsafe_test`, through `prepare-test-db` or `resetTables()`, which both check the guard in `scripts/test-db-guard.ts`.

## Tests

- **Unit tests** (`test/unit/`): no database.
- **Integration tests** (`test/*.int.test.ts`): the real app from `createTestApp()` with Supertest. `test/setup-file.ts` empties the tables before each file.
- **Titles** start with the story and acceptance criterion: `it('S02.1 AC2 refuses a non-admin with 403', …)`. E01's tests keep their `TC-…` titles.
- **Every endpoint:** a successful call, an invalid input, and a 401 or 403 for each role that must be refused.

## Commands

- `pnpm --filter @labsafe/api test`: unit tests.
- `pnpm test:int`: integration tests.
- `pnpm verify`: everything; must pass before a ticket is done.
