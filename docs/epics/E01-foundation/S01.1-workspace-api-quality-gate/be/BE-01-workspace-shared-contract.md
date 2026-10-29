---
id: BE-01
story: S01.1
layer: be
status: done
depends_on: []
covers: [AC1, AC2]
updated: 2026-10-29
---

# BE-01 Workspace and shared contract package

**Goal:** create the pnpm workspace and the `@labsafe/shared` package with the fixed lists, the error contract and the health schema. **Automates:** TC-2.1, TC-2.2. **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `package.json` (root), `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`
- create `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/tsup.config.ts`
- create `packages/shared/src/index.ts`, `src/lists.ts`, `src/errors.ts`, `src/schemas/health.ts`, `src/shared.test.ts`

## Approach

1. **Root `package.json`:** `"private": true`, `"name": "labsafe"`, `"packageManager": "pnpm@<exact version of pnpm --version>"`, `"engines": { "node": ">=24" }`. Scripts for now:
   - `build`: `pnpm -r build` (pnpm runs packages in dependency order);
   - `typecheck`: `pnpm --filter @labsafe/shared build && pnpm -r typecheck`. Building shared first lets api and web type-check against current `dist` types. This adds one step to design §5 (`pnpm -r typecheck`); record it in the notes;
   - `test`: `pnpm -r test`;
   - `docs:check`: `node .claude/tools/docs-check.mjs`.
   Later tickets add the other scripts. Root devDependency: `typescript` 6.0 (design §1).
2. **`pnpm-workspace.yaml`:** `packages: [apps/*, packages/*, e2e]`. Add `allowBuilds:` with exactly the native builds pnpm reports (expected now: `esbuild`, which tsup needs). `.nvmrc`: `24`.
3. **`tsconfig.base.json`:** `strict`, `noUncheckedIndexedAccess`, `target: ES2023`, `skipLibCheck`, `isolatedModules`. Use no option that TypeScript 6.0 marks as deprecated (for example `baseUrl`, `moduleResolution: node10`). Packages extend it and set their own `module` and `moduleResolution`.
4. **`packages/shared`:** `"name": "@labsafe/shared"`, `"type": "module"`, dependency `zod` 4, devDependencies `tsup` 8 and `vitest` 4. Exports for both module systems (design E01-D2):
   `".": { "import": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }, "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" } }`.
   Scripts: `build` (`tsup`), `dev` (`tsup --watch`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`). `tsup.config.ts`: entry `src/index.ts`, `format: ['esm', 'cjs']`, `dts: true`, `clean: true`.
5. **`src/lists.ts`** (design §3, E01-D7): `as const` arrays of `{ value, label }`, in PRD §4.2 order, labels word for word from the PRD:
   - `HAZARD_TYPES`: ELECTRICAL, HOT_SURFACE, CRYOGENIC, HIGH_PRESSURE, VACUUM, FIRE, CHEMICAL_EXPOSURE, UV_RADIATION, LASER, IONIZING_RADIATION, MAGNETIC_FIELD, MOVING_PARTS, GLASS_SHARPS, NOISE, BIOLOGICAL.
   - `PROTECTIVE_EQUIPMENT`: SAFETY_GLASSES, SPLASH_GOGGLES, FACE_SHIELD, LAB_COAT, FLAME_RESISTANT_LAB_COAT, CHEMICAL_RESISTANT_GLOVES, HEAT_RESISTANT_GLOVES, CRYOGENIC_GLOVES, CUT_RESISTANT_GLOVES, LASER_SAFETY_EYEWEAR, UV_PROTECTIVE_EYEWEAR, HEARING_PROTECTION, RESPIRATOR, CLOSED_TOE_SHOES.
   - `HAZARD_PICTOGRAMS`: EXPLOSIVE, FLAMMABLE, OXIDIZING, COMPRESSED_GAS, CORROSIVE, TOXIC, HARMFUL_IRRITANT, HEALTH_HAZARD, ENVIRONMENTAL_HAZARD.
   - `CATEGORIES`: HEATING_THERMAL, SEPARATION_EVAPORATION, ANALYTICAL_SPECTROSCOPY, PRESSURE_VACUUM, COOLING_CRYOGENIC, MIXING_CENTRIFUGATION, VENTILATION_CONTAINMENT, OTHER.
   - `HAZARD_LEVELS`: LOW "Low", MEDIUM "Medium", HIGH "High"; and `HazardLevel = z.enum(['LOW', 'MEDIUM', 'HIGH'])` with its type.
   - The value unions, for example `type HazardTypeValue = (typeof HAZARD_TYPES)[number]['value']`.
6. **`src/errors.ts`** and **`src/schemas/health.ts`:** exactly as in the story's contract. `src/index.ts` re-exports all three files.
7. **`src/shared.test.ts`:** TC-2.1 and TC-2.2, each test title starting with its TC identifier. TC-2.1 compares the labels against a literal copy of PRD §4.2.
8. **Proof of work:** `pnpm install`, `pnpm --filter @labsafe/shared build` (creates `dist/index.js`, `.cjs`, `.d.ts`, `.d.cts`), `pnpm test`, `pnpm typecheck`, `pnpm docs:check`.

## Out of scope

`MetaListsResponse` and `ListItem` (S01.2). Lint, Prettier and `pnpm verify` (BE-06). Error codes for later epics.

## Implementation notes

2026-10-29

- **Done:** root `package.json` (`packageManager: pnpm@11.0.8`, `engines.node >=24`, scripts `build`, `typecheck`, `test`, `docs:check`; devDependency `typescript ~6.0.3`, pinned to 6.0.x because typescript-eslint supports only `< 6.1`), `pnpm-workspace.yaml`, `.nvmrc` (`24`), `tsconfig.base.json` (no deprecated options), and `packages/shared` (zod 4.6, tsup 8.5, vitest 4.1) with `lists.ts`, `errors.ts`, `schemas/health.ts`, `index.ts` and `shared.test.ts`. `pnpm-lock.yaml` was created by `pnpm install`.
- **Native builds:** pnpm reported exactly `esbuild` (needed by tsup); it is the only entry in `allowBuilds:`. A second `pnpm install` shows no "ignored build scripts" warning.
- **Tests:** `src/shared.test.ts` has 14 tests, all titled `TC-2.1 …` or `TC-2.2 …`. TC-2.1 checks counts 15/14/9/8/3, compares every label with a literal copy of PRD §4.2 (in order), checks values are unique and match `^[A-Z][A-Z0-9_]*$`, and checks that `HazardLevel.options` equals the `HAZARD_LEVELS` values. TC-2.2 covers `HealthResponse` (accepts ok/ok, rejects `{status:"down"}`) and `ErrorResponse` (with and without `fields`; rejects an unknown `code`).
- **Proof of work:** `pnpm install`, `pnpm --filter @labsafe/shared build` (creates `dist/index.js`, `.cjs`, `.d.ts`, `.d.cts`; loaded through `import` and `require`), `pnpm test` (14 passed), `pnpm typecheck` and `pnpm docs:check` all exit 0.
- **Deviation 1 (`typecheck` script):** it is `pnpm --filter @labsafe/shared build && pnpm -r typecheck`, one step more than design §5 (`pnpm -r typecheck`), as this ticket specifies, so api and web type-check against current `dist` types.
- **Deviation 2 (`tsup.config.ts`):** `dts: { compilerOptions: { ignoreDeprecations: '6.0' } }` instead of `dts: true`. tsup 8.5 sets the deprecated `baseUrl` in its own internal declaration build, and TypeScript 6 fails it with TS5101. Our own tsconfig files use no deprecated option; the silencing applies only to tsup's declaration step. It can go once tsup stops setting `baseUrl` (or when the project moves to TypeScript 7, which would need a new design decision).
- **Migrations:** none.
