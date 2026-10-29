---
id: BE-06
story: S01.1
layer: be
status: done
depends_on: [BE-05]
covers: [AC11, AC12]
updated: 2026-10-29
---

# BE-06 Quality gate and API coding rules

**Goal:** add formatting, linting and the single `pnpm verify` gate, and write `apps/api/CLAUDE.md`. **Automates:** none (TC-11.1, TC-11.2 and TC-12.1 are checked by hand). **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `eslint.config.mjs`, `.prettierrc`, `.prettierignore`
- change `package.json` (root scripts and devDependencies)
- create `apps/api/CLAUDE.md`
- change any code file that `pnpm format` or `pnpm lint` reports (formatting and lint fixes only)

## Approach

1. **Root devDependencies** (design §1): `eslint` 10, `@eslint/js`, `typescript-eslint` 8, `globals`, `prettier` 3.
2. **`eslint.config.mjs`** (flat config): global `ignores` for `**/dist/**`, `**/coverage/**`, `playwright-report/`, `test-results/`, `.claude/`, `.qodo/`, `docs/`. Then `js.configs.recommended`, `tseslint.configs.recommended` (not the type-aware set, to keep lint fast), and Node globals for `apps/api/**`, `packages/**`, `e2e/**` and the root config files. S01.2 FE-01 adds the React block for `apps/web/**`.
3. **Prettier:** `.prettierrc` = `{ "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`. `.prettierignore`: `**/dist`, `coverage`, `pnpm-lock.yaml`, `docs/`, `.claude/`, `.qodo/`, `**/*.md`, `*.pdf`, `playwright-report`, `test-results`. Markdown is left alone, because the documents are formatted by hand and checked by `docs:check`.
4. **Root scripts:** `format` (`prettier --write .`), `format:check` (`prettier --check .`), `lint` (`eslint .`), and `verify` (design §5), joined with `&&` so it stops at the first failure:
   `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm build && pnpm docs:check`.
   Run `pnpm format`, then fix what `pnpm lint` reports in the code from BE-01 to BE-05. Disable a rule only with a one-line reason next to it.
5. **`apps/api/CLAUDE.md`:** short rules, one bullet each, covering every point of design §10:
   - Module layout: `src/modules/<name>/` with `*.module.ts`, a thin `*.controller.ts` (HTTP only), a `*.service.ts` (rules and transactions) and TypeORM repositories used only by services.
   - Every input is parsed with a shared Zod schema through `ZodValidationPipe`.
   - Return mapped objects that match the shared response schema, never entities.
   - Errors are thrown as `AppException` with an `ErrorCode`; the `ErrorFilter` formats them. Add new codes to `packages/shared/src/errors.ts` and to the filter.
   - Configuration is read only through `loadConfig()` and `APP_CONFIG`. A new setting goes in `config.ts` and `.env.example`.
   - Migrations: generate with `db:generate`, read every line, keep it, and append it to `ALL_MIGRATIONS`. Never use `synchronize`. Never edit a migration that is already on `master`. Destructive commands only on `labsafe_test`, through `prepare-test-db`.
   - Tests: unit tests `*.test.ts` next to the code; integration tests `test/*.int.test.ts` using `createTestApp()` and `resetTables()`. Titles start with the test-case identifier. Every endpoint needs a successful call, an invalid input and each refused role.
   - Database commands (`db:up`, `db:migrate`, `db:generate`, `test:db:prepare`, any SQL) need the user's approval. `pnpm verify` and `pnpm e2e` are the only exceptions.
   - The commands: `pnpm --filter @labsafe/api test`, `pnpm test:int`, `pnpm verify`.
6. **Proof of work:** `pnpm verify` passes (TC-11.1). By hand: TC-11.2 (a badly formatted line stops `verify` at the first step; undo it afterwards).

## Out of scope

`pnpm e2e` and `pnpm qa:serve` (S01.3). React lint rules (S01.2). `apps/web/CLAUDE.md` (S01.2).

## Implementation notes

- **Root devDependencies:** `eslint` ^10.13.0, `@eslint/js` ^10.0.1, `typescript-eslint` ^8.72.1 (peer range `typescript <6.1`, so it fits TypeScript 6.0), `globals` ^17.13.0, `prettier` ^3.9.10. They add no new peer warnings; the two that `pnpm peers check` reports (`chokidar` for `@swc/cli`, `webpack` for `schema-utils`) were there before this ticket.
- **`eslint.config.mjs`:** flat config with the listed global `ignores`, `js.configs.recommended`, `tseslint.configs.recommended` (not type-aware) and `globals.node` for `apps/api/**`, `packages/**`, `e2e/**` and the root `*.{js,mjs,cjs,ts,mts,cts}` files. It wraps the blocks in ESLint's own `defineConfig` (from `eslint/config`) rather than `tseslint.config()`, which recent typescript-eslint 8 releases mark deprecated; the result is the same. ESLint checks 35 files and reports nothing, so no rule is disabled.
- **Prettier:** `.prettierrc` and `.prettierignore` as listed, **plus `.mcp.json`** in `.prettierignore` (deviation): it is the Claude tooling's MCP configuration, in the same category as `.claude/`, so it is left as it is rather than reformatted.
- **`pnpm format`** reformatted 15 files from BE-01 to BE-05 (line wrapping at 100 columns only; no code change): `apps/api/{scripts/test-db-guard.test.ts, src/app.module.ts, src/common/{config.test,error.filter.test,error.filter,zod-validation.pipe.test,zod-validation.pipe}.ts, src/modules/health/health.service.test.ts, test/{foundation.int.test,health.int.test,helpers}.ts, vitest.config.mts, vitest.int.config.mts}`, `packages/shared/src/{errors,shared.test}.ts`. The migration was not touched. Every `TC-…` test title is unchanged (two `it.each` titles now start on their own line).
- **Root scripts:** `format`, `format:check`, `lint` and `verify` (`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm build && pnpm docs:check`).
- **`apps/api/CLAUDE.md`:** written with one bullet per rule in the Approach list (layout, Zod input, mapped output, `AppException`/`ErrorFilter`, `loadConfig`/`APP_CONFIG`, migrations and `ALL_MIGRATIONS`, `synchronize`, migrations on `master`, `prepare-test-db`, database approval, unit and integration tests with `createTestApp`/`resetTables`, test names, the per-endpoint minimum, and the three commands). It covers every point of E01 design §10.
- **Proof of work:** TC-11.1: `pnpm verify` ran the seven steps in order and exited 0 (shared 14 unit tests, API 35 unit tests, 9 integration tests, docs check OK). TC-11.2: one badly formatted line appended to `apps/api/src/common/app.exception.ts` made `verify` stop at `prettier --check` with exit 1 and no later step; the file was restored from a copy and checked byte for byte.
- No migrations.
