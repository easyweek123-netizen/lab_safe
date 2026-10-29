---
id: FE-01
story: S01.2
layer: fe
status: todo
depends_on: []
covers: [AC3, AC8, AC9]
updated: 2026-10-29
---

# FE-01 Web app scaffold and app shell

**Goal:** create the React app `@labsafe/web` (Vite, React Router, TanStack Query, Tailwind) with the mobile-first app shell, its component-test set-up and `pnpm dev` on :5173. **Automates:** TC-3.1, TC-3.2. **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`
- create `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/index.css`, `apps/web/src/components/AppShell.tsx`
- create `apps/web/src/test/setup.ts`, `apps/web/src/test/render.tsx`, `apps/web/src/App.test.tsx`
- change `package.json` (root: `dev:web`), `eslint.config.mjs` (React block)

## Approach

1. **Package** (design §1): `"name": "@labsafe/web"`, `"type": "module"`, `"private": true`. Dependencies: `react` and `react-dom` 19, `react-router` 8, `@tanstack/react-query` 5, `zod` 4, `@labsafe/shared: workspace:*`. devDependencies: `vite` 8, `@vitejs/plugin-react` 6, `tailwindcss` 4, `@tailwindcss/vite`, `vitest` 4, `jsdom`, `@testing-library/react` 16, `@testing-library/user-event`, `@testing-library/jest-dom`, `@types/react`, `@types/react-dom`. Scripts: `dev` (`vite --port 5173 --strictPort`), `build` (`vite build`), `typecheck` (`tsc --noEmit`), `test` (`vitest run`). Approve any native build pnpm reports in `allowBuilds`.
2. **`vite.config.ts`:** plugins `react()` and `tailwindcss()`; `server.proxy` `/api` → `http://localhost:3000` (design §5). A `test` block: `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, and `resolve.alias` `@labsafe/shared` → `../../packages/shared/src/index.ts`, applied only in tests, like the API's vitest config.
3. **`tsconfig.json`:** extends the base; `jsx: react-jsx`, `module: ESNext`, `moduleResolution: bundler`, types for `vite/client` and `@testing-library/jest-dom`.
4. **`index.html`:** `<html lang="en">`, `<meta charset="UTF-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<title>LabSafe</title>`, `<div id="root">`, the module script `/src/main.tsx`.
5. **`src/index.css`:** `@import "tailwindcss";` only. Use Tailwind and no other CSS framework.
6. **`src/App.tsx`:** export `routes: RouteObject[]`: one layout route with `element: <AppShell />` and, for now, no children. FE-02 and FE-03 add the child routes. Export `App`, which renders `createBrowserRouter(routes)`. `src/main.tsx` creates a `QueryClient` (`retry: 1`) and renders `<QueryClientProvider><App /></QueryClientProvider>` inside `StrictMode`.
7. **`src/components/AppShell.tsx`** (design §8): a `<header>` with a `<Link to="/">` "LabSafe" wordmark, and a `<main className="mx-auto w-full max-w-5xl px-4 py-6">` with `<Outlet />`. Design it mobile-first: nothing wider than the viewport, and text at least 16 px.
8. **`src/test/setup.ts`:** import `@testing-library/jest-dom/vitest`; `afterEach(cleanup)`. FE-03 adds MSW here.
9. **`src/test/render.tsx`:** `renderApp(path)` renders `createMemoryRouter(routes, { initialEntries: [path] })` inside a fresh `QueryClient` (`retry: false`) and returns Testing Library's result plus a `user-event` instance; every later page test uses it. **`src/App.test.tsx`:** TC-3.1 renders `/` and finds the `banner`, the link "LabSafe" and one `main` by role. TC-3.2 reads `index.html` with `node:fs` and checks `lang`, title and viewport.
10. **Root:** add the script `dev:web` (`pnpm --filter @labsafe/web dev`); `pnpm dev` picks it up through `pnpm:dev:*` (S01.1 BE-02). **`eslint.config.mjs`:** add a block for `apps/web/**/*.{ts,tsx}` with `eslint-plugin-react-hooks` (recommended rules) and browser globals; add the plugin as a root devDependency.
11. **Proof of work:** `pnpm verify`. By hand: `pnpm dev` shows the shell at `http://localhost:5173` with no sideways scrolling at 375 px (part of TC-8.1).

## Out of scope

The home and not-found pages, the API client and MSW (FE-02, FE-03). Serving the build from Nest (S01.3).

## Implementation notes

<!-- Filled in by the dev: what was done, deviations from this ticket or the design and why. -->
