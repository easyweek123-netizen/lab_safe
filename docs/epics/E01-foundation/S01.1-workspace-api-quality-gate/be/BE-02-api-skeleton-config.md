---
id: BE-02
story: S01.1
layer: be
status: done
depends_on: [BE-01]
covers: [AC1, AC7]
updated: 2026-10-29
---

# BE-02 API skeleton and configuration

**Goal:** create the NestJS app `@labsafe/api` (CommonJS, built with SWC) that checks its settings at start-up, plus the root `pnpm dev` for shared and API. **Automates:** TC-7.1, TC-7.2, TC-7.3. **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, `apps/api/vitest.config.ts`
- create `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- create `apps/api/src/common/config.ts`, `apps/api/src/common/config.test.ts`
- change `package.json` (root: `dev` scripts), `pnpm-workspace.yaml` (`allowBuilds`)

## Approach

1. **Package:** `"name": "@labsafe/api"`, `"type": "commonjs"`, `"private": true`. Dependencies (majors from design §1): `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` 11, `reflect-metadata`, `rxjs`, `zod` 4, `@labsafe/shared: workspace:*`. devDependencies: `@nestjs/cli`, `@nestjs/testing` 11, `@swc/core` 1, `@swc/cli`, `unplugin-swc` 2, `vitest` 4, `@types/node`. Add `@swc/core` to `allowBuilds` exactly as pnpm reports.
2. **Build (design E01-D3):** `nest-cli.json` with `compilerOptions.builder: "swc"`, `typeCheck: false`, output to `dist/` with `dist/main.js` as the entry. `tsconfig.json` extends `../../tsconfig.base.json`, with `experimentalDecorators` and `emitDecoratorMetadata`, and module settings that give CommonJS without TypeScript 6.0 deprecation warnings. Scripts: `build` (`nest build`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `start` (`node dist/main.js`), and `dev`: Nest in watch mode on :3000 that loads the root `.env` with `node --env-file-if-exists=../../.env` (design §5, E01-D6). If `nest start --watch --exec "node --env-file-if-exists=../../.env"` does not pass the flag through, use another way with the same effect and record it.
3. **`vitest.config.ts`:** `plugins: [swc.vite()]` (decorators), `include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']`, and `resolve.alias` `@labsafe/shared` → `../../packages/shared/src/index.ts`, so unit tests never need a shared build.
4. **`src/common/config.ts`** (design §7): a Zod schema over `process.env`:
   - `NODE_ENV`: `development | test | production`, default `development`;
   - `PORT`: integer 1–65535 (coerced from text), default 3000;
   - `DATABASE_URL`: required URL;
   - `WEB_DIST_DIR`: optional text (S01.3 adds its check).
   Export `type AppConfig`, `class ConfigError extends Error`, `loadConfig(env = process.env): AppConfig` (throws one `ConfigError` whose message is `Invalid configuration: ` followed by one `NAME: problem` part per bad setting), and the injection token `APP_CONFIG`.
5. **`src/app.module.ts`:** a dynamic module `AppModule.forRoot(config: AppConfig)` that provides `{ provide: APP_CONFIG, useValue: config }` globally. Later tickets add imports here; tests create the app with their own config, so never call `loadConfig()` at import time.
6. **`src/main.ts`:** call `loadConfig()`. On `ConfigError`, print only its message to stderr and `process.exit(1)` (no stack trace). Otherwise create the app from `AppModule.forRoot(config)` and listen on `config.PORT`. BE-03 adds the shared app set-up.
7. **Root `package.json`:** add devDependency `concurrently` 10 and the scripts `dev:shared` (`pnpm --filter @labsafe/shared dev`), `dev:api` (`pnpm --filter @labsafe/api dev`) and `dev` (`concurrently -k -n shared,api,web "pnpm:dev:*"`). S01.2 FE-01 adds `dev:web`, which `pnpm:dev:*` then picks up without changing `dev`.
8. **`src/common/config.test.ts`:** TC-7.1 to TC-7.3; each test passes its own env object, never `process.env`.
9. **Proof of work:** `pnpm --filter @labsafe/api test`, `pnpm typecheck`, `pnpm build`; then by hand `env -u DATABASE_URL node apps/api/dist/main.js` exits 1 with the message (TC-7.4).

## Out of scope

Global prefix, error filter, validation pipe (BE-03). TypeORM, database and health endpoint (BE-04, BE-05). Settings of later epics.

## Implementation notes

2026-10-29

- **Done:** `@labsafe/api` (CommonJS, private) with NestJS 11.2, zod 4.6, `@nestjs/cli` 11.0, `@swc/core` 1.16, `@swc/cli` 0.8, `unplugin-swc` 2.0, vitest 4.1 and `@types/node` 24; `nest-cli.json` (SWC, `typeCheck: false`, `deleteOutDir`), `tsconfig.json` (`module`/`moduleResolution: NodeNext`, which emits CommonJS for a `"type": "commonjs"` package, with no TS 6.0 deprecation warning; decorators; `types: ["node"]`, because TS 6 no longer loads every `@types` package by default), `src/common/config.ts`, `src/app.module.ts` (`AppModule.forRoot(config)`, global `APP_CONFIG`), `src/main.ts`. Root: `concurrently` 10 and the scripts `dev`, `dev:shared`, `dev:api`. `allowBuilds:` now has `'@swc/core': true` (exactly what pnpm reported), next to `esbuild`.
- **Config:** `loadConfig(env = process.env)` throws one `ConfigError` with one line, for example `Invalid configuration: NODE_ENV: must be one of development, test, production; PORT: must be a whole number from 1 to 65535; DATABASE_URL: is required`. Settings are named in schema order, and values are never echoed. Unknown variables are dropped. `APP_CONFIG` is a `Symbol`.
- **Tests:** `src/common/config.test.ts` has 9 tests: TC-7.1 (missing `DATABASE_URL`; also a non-URL value), TC-7.2 (`PORT=abc` with `NODE_ENV=staging` in one error; also `PORT` 0, 65536, 30.5 and empty), TC-7.3 (defaults 3000 / `development` / no `WEB_DIST_DIR`; also text `PORT` coerced and unknown keys dropped).
- **Proof of work:** `pnpm --filter @labsafe/api test` (9 passed), `pnpm test` (14 + 9), `pnpm typecheck`, `pnpm build` and `pnpm docs:check` all exit 0. TC-7.4 by hand: `env -u DATABASE_URL node apps/api/dist/main.js` prints `Invalid configuration: DATABASE_URL: is required` and exits 1, with no stack trace. With valid settings, the built app listens on the given `PORT`, or on 3000 when `PORT` is not set.
- **`dev` passes the flag through:** `nest start --watch --exec "node --env-file-if-exists=../../.env"` works as written. The Nest CLI spawns the child process in a shell by default, so the result is `node --env-file-if-exists=../../.env --enable-source-maps dist/main.js`. Checked with a scratch env file instead of the real `.env`: the app read `DATABASE_URL` and `PORT` from it, and restarted after a source edit. `concurrently` was checked with `pnpm:dev:shared`. The full `pnpm dev` was not run, because it would load the real `.env`.
- **Deviation 1 (`vitest.config.mts` instead of `vitest.config.ts`):** in this CommonJS package, Vite 8 warns about "ESM syntax in a file loaded as CommonJS" for a `.ts` config, and the `runner` config loader cannot load it either. The `.mts` file is a real ES module (it uses `import.meta.url` for the `@labsafe/shared` alias) and produces no warning. **BE-05** should name its file `vitest.int.config.mts` for the same reason.
- **Deviation 2 (`nest-cli.json` builder in object form):** `"builder": { "type": "swc", "options": { "ignore": ["**/*.test.ts"] } }` instead of `"builder": "swc"`, so test files are not compiled into `dist/`. `tsconfig.json` has no `rootDir`, because the Nest CLI keeps the `src/` prefix (`dist/src/main.js`) when `rootDir` is set; the entry is `dist/main.js`, as required.
- **Peer warnings (not fixed, harmless here):** `pnpm peers check` reports `schema-utils` wanting webpack ^5.112 (the Nest CLI pins webpack 5.106; we do not use the webpack builder), and `@swc/cli` wanting chokidar ^5 (4.0.3 is installed; watch mode works).
- **Fix B2 (2026-10-29, `/fix S01.1`):** the root `dev` is now `concurrently -k "pnpm:dev:*"`, with no `-n` list. With `-n shared,api,web`, concurrently 10 put the first name in front of every name the wildcard expanded, so the labels were `[sharedshared]` and `[sharedapi]`. Without `-n`, each expanded script is labelled by the part the wildcard matched: `[shared]`, `[api]`, and later `[web]` when S01.2 FE-01 adds `dev:web`. This differs from step 7, which gave the `-n` form.
- **Migrations:** none.
