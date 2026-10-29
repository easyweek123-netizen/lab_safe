---
id: FE-01
story: S01.2
layer: fe
status: done
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

- **Done:** `@labsafe/web` with every file listed above. Installed: react and react-dom 19.3, react-router 8.5, @tanstack/react-query 5.105, zod 4.6, vite 8.3, @vitejs/plugin-react 6.1, tailwindcss and @tailwindcss/vite 4.3, vitest 4.1 (not 5; E01-D1), jsdom 30.1, @testing-library/react 16.3, user-event 14.6, jest-dom 7.0, @types/react and @types/react-dom 19.3. `eslint-plugin-react-hooks` 7.1 is a root devDependency. pnpm reported no new native builds, so `allowBuilds` is unchanged.
- **Tests:** `src/App.test.tsx` has TC-3.1 (the `banner` contains the link "LabSafe" with `href="/"`, and there is exactly one `main`) and TC-3.2 (`index.html` is parsed with `DOMParser`: `lang="en"`, the title "LabSafe", the phone viewport). Both pass.
- **By hand:** `pnpm dev:web` serves the shell on :5173, and `/api/*` is forwarded to :3000 (502 while Nest is stopped). A headless Chromium screenshot at 375 × 812 shows the header with no sideways overflow.
- **Difference: the layout route has `path: '/'`.** A layout route with no path and no children matches no URL, so `/` showed React Router's "No route matches" error. With `path: '/'`, FE-02's `*` child and FE-03's index child still nest under it unchanged.
- **Difference: extra devDependencies.** I added `@testing-library/dom` (a peer dependency of Testing Library React 16) and `@types/node` (TC-3.2 reads the file with `node:fs`).
- **Difference: `tsconfig.json` types.** I used `@testing-library/jest-dom/vitest` (the Vitest matcher types) instead of `@testing-library/jest-dom`, plus `node`. I also added `lib` with DOM.
- **Difference: the Vite alias is a function of `mode`.** Vitest runs with `mode === 'test'`. I checked that tests resolve `@labsafe/shared` even with `packages/shared/dist` removed. The dev server and the build use the built package.
- **Difference: ESLint.** Besides the `apps/web/**/*.{ts,tsx}` block (react-hooks `flat.recommended` and browser globals), a small block gives `apps/web/vite.config.ts` Node globals, because it runs in Node.
- **Difference: test file paths.** TC-3.2 builds the path with `import.meta.dirname`. jsdom replaces the global `URL`, so `new URL(..., import.meta.url)` is not accepted by `readFileSync`.
