---
id: BE-04
story: S01.1
layer: be
status: done
depends_on: [BE-03]
covers: [AC3, AC9, AC10]
updated: 2026-10-29
---

# BE-04 Databases, lab rooms migration and test-database guard

**Goal:** start both PostgreSQL databases with `pnpm db:up`, create the `lab_rooms` migration, and add `prepare-test-db`, which can only ever reset `labsafe_test` on port 5443. **Automates:** TC-10.1, TC-10.2. **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `docker-compose.yml`, `.env.example`
- change `package.json` (root scripts), `apps/api/package.json`
- create `apps/api/src/db/data-source.ts`, `apps/api/src/db/cli-data-source.ts`
- create `apps/api/src/db/migrations/<timestamp>-CreateLabRooms.ts`, `apps/api/src/db/migrations/index.ts`
- create `apps/api/scripts/test-db-guard.ts`, `apps/api/scripts/test-db-guard.test.ts`, `apps/api/scripts/prepare-test-db.ts`

## Approach

1. **`docker-compose.yml`** (design §7): top-level `name: labsafe`. Service `db`: `image: postgres:15`, `pull_policy: missing`, `POSTGRES_USER/PASSWORD/DB` = `labsafe/labsafe/labsafe`, port `5442:5432`, named volume `labsafe-db`. Service `db-test`: same user and password, `POSTGRES_DB=labsafe_test`, port `5443:5432`, `tmpfs: /var/lib/postgresql/data`. Both have a `pg_isready -U labsafe -d <db>` health check. Never use port 5432 on the host.
2. **`.env.example`:** `NODE_ENV=development`, `PORT=3000`, `DATABASE_URL=postgres://labsafe:labsafe@localhost:5442/labsafe`, and `# WEB_DIST_DIR=` (not set in development). Never read or write `.env`.
3. **Root scripts:** `db:up` (`docker compose up -d --wait db db-test`), `db:down` (`docker compose stop db db-test`), `db:migrate` (`pnpm --filter @labsafe/api db:migrate`), `test:db:prepare` (`pnpm --filter @labsafe/api test:db:prepare`).
4. **API dependencies:** `@nestjs/typeorm` 11, `typeorm` 0.3, `pg` 8; devDependencies `tsx` 4, `@types/pg`. Scripts: `db:migrate` runs the TypeORM CLI through `tsx` with `migration:run -d src/db/cli-data-source.ts`, loading `../../.env` with `--env-file-if-exists`; `test:db:prepare` runs `tsx scripts/prepare-test-db.ts`. Check that `tsconfig.json` type-checks `scripts/` too.
5. **`src/db/data-source.ts`:** export `ALL_MIGRATIONS` (re-exported from `migrations/index.ts`, an explicit array; later epics append to it, no file globs) and `dataSourceOptions(url: string): DataSourceOptions` = `{ type: 'postgres', url, migrations: ALL_MIGRATIONS, migrationsTableName: 'migrations', synchronize: false, extra: { connectionTimeoutMillis: 3000 } }`. `cli-data-source.ts` default-exports `new DataSource({ ...dataSourceOptions(loadConfig().DATABASE_URL), entities: ['src/**/*.entity.ts'] })` for the CLI only (the entity glob lets later epics run `migration:generate`). It is a separate file so that importing the options never reads the configuration. Also add the API script `db:generate` (`migration:generate` with the same data source; usage `pnpm --filter @labsafe/api db:generate src/db/migrations/<Name>`); it reads the development database, so it needs the user's approval too.
6. **Migration `CreateLabRooms<timestamp>`** (design §3): written by hand (there is no entity to generate from yet). `up`: `CREATE TABLE lab_rooms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK (code <> ''), name text NOT NULL CHECK (name <> ''))`, then insert the placeholder rooms `LAB-101` "Teaching lab 1", `LAB-102` "Teaching lab 2", `LAB-201` "Research lab", `LAB-202` "Instrument room". `down`: `DROP TABLE lab_rooms`. Add a comment: placeholders, to be replaced with the real rooms before the demo (PRD §7).
7. **`scripts/test-db-guard.ts`** (design §6, E01-D4): export `TEST_DATABASE_URL = 'postgres://labsafe:labsafe@localhost:5443/labsafe_test'` and `assertTestDatabase(url: string)`. It parses the URL and throws unless the database name is exactly `labsafe_test` and the port is exactly `5443`. The error message names both expected values. A URL that cannot be parsed also throws.
8. **`scripts/prepare-test-db.ts`:** export `prepareTestDb(url = TEST_DATABASE_URL)`. It calls `assertTestDatabase(url)` before any connection. Then it connects with `dataSourceOptions(url)`, runs `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`, runs the migrations, and closes. If the connection is refused, it throws an error with the message `The test database on localhost:5443 is not running. Run \`pnpm db:up\` first.` When run as a script, it prints only that message and exits 1. It reads no environment variable, so a `DATABASE_URL` in the shell can never redirect it. Later epics add the e2e seed here.
9. **`scripts/test-db-guard.test.ts`:** TC-10.1, TC-10.2.
10. **Proof of work:** `pnpm --filter @labsafe/api test`, `pnpm typecheck`. Then, **each only after the user approves it**: `pnpm db:up` (TC-3.1) and `pnpm test:db:prepare` run twice (TC-10.3). Don't run `pnpm db:migrate` against the development database unless the user asks for it.

## Out of scope

TypeORM in the Nest app, `resetTables`, integration tests (BE-05). The e2e seed (later epics). Running `db:generate` (no entity exists yet; the first generated migration comes in E02).

## Implementation notes

- **Docker:** `docker-compose.yml` follows step 1 exactly, with health checks every 2 s (30 retries). Compose prefixes the volume with the project name, so on disk it is `labsafe_labsafe-db`. `.env.example` follows step 2.
- **Scripts:** the root scripts are `db:up`, `db:down`, `db:migrate` and `test:db:prepare`. The API's `db:migrate` and `db:generate` run `tsx --env-file-if-exists=../../.env ./node_modules/typeorm/cli.js … -d src/db/cli-data-source.ts`, calling `cli.js` directly because the `.bin/typeorm` shim cannot be run through tsx. `tsconfig.json` now includes `scripts/`. `nest build` still writes `dist/main.js`, because the SWC builder compiles only `src`.
- **Dependencies:** `@nestjs/typeorm` ^11.0.3, `typeorm` ^0.3.31 and `pg` ^8.23.1; dev dependencies `tsx` ^4.23.15 and `@types/pg` ^8.23.1. None needs a native build. The existing peer warnings (webpack, chokidar) come from the Nest CLI toolchain, not from these packages.
- **Migration:** `apps/api/src/db/migrations/1793232000000-CreateLabRooms.ts`, class `CreateLabRooms1793232000000` (timestamp 2026-10-29 00:00 UTC). Written by hand as in step 6. `ALL_MIGRATIONS` in `migrations/index.ts` is an explicit array, re-exported by `data-source.ts`.
- **Guard:** `assertTestDatabase` throws a `NotTestDatabaseError` whose message says why and always names `"labsafe_test"` and port 5443. It compares the decoded path with `labsafe_test` and the URL port with `5443`, so a URL with no port is refused too.
- **`prepareTestDb`:** runs the guard, then `initialize`, then `DROP SCHEMA public CASCADE`, `CREATE SCHEMA public`, `runMigrations({ transaction: 'each' })`, and `destroy` in `finally`. A refused connection, including Node's `AggregateError` when it tries both IPv4 and IPv6, becomes a `TestDatabaseNotRunningError` with the exact message from step 8. The script part runs only when `require.main === module`, behind `typeof` checks, so importing the file from Vitest (ESM) or a later `globalSetup` does nothing. On success it prints `Test database labsafe_test is ready.`
- **Tests** in `apps/api/scripts/test-db-guard.test.ts`:
  - TC-10.1: the four URLs from the story, plus a URL without a port and `labsafe_test2`. Each throws and the message names both values.
  - TC-10.1: `prepareTestDb` refuses the same URLs before `DataSource.initialize` is called.
  - TC-10.2: the test URL is accepted.
  - One extra test, `AC10 …`: a mocked refused connection gives the "run `pnpm db:up`" message and no query runs. It has no test case of its own; TC-10.4 is manual.
- **Proof of work:**
  - `pnpm --filter @labsafe/api test`: 32 passed.
  - `pnpm typecheck`: exit 0. `pnpm --filter @labsafe/api build`: exit 0.
  - The TypeORM CLI, pointed at a closed port and without `.env`, loads `cli-data-source.ts` and fails only at `ECONNREFUSED`.
  - With the user's approval:
    - `pnpm test:db:prepare` with the databases down printed only the not-running message and exited 1.
    - `pnpm db:up` (TC-3.1): `db` on 5442 and `db-test` on 5443, both healthy, no image pulled.
    - `pnpm test:db:prepare` twice (TC-10.3): both exited 0.
    - A read-only query on `labsafe_test` showed exactly the 4 rooms, one migration record and the constraints `lab_rooms_pkey`, `lab_rooms_code_key`, `lab_rooms_code_check` and `lab_rooms_name_check`.
  - `pnpm db:migrate` was not run against the development database.
- **Differences from the ticket:** none in behaviour. Extras: the error classes `NotTestDatabaseError` and `TestDatabaseNotRunningError`, the exported `TEST_DB_NOT_RUNNING_MESSAGE`, and the extra test above.
