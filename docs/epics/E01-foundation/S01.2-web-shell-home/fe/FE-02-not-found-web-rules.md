---
id: FE-02
story: S01.2
layer: fe
status: todo
depends_on: [FE-01]
covers: [AC7, AC10]
updated: 2026-10-29
---

# FE-02 Not-found page and web coding rules

**Goal:** add the "Page not found" page for every unknown address and write `apps/web/CLAUDE.md`. **Automates:** TC-7.1. **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `apps/web/src/pages/not-found/NotFoundPage.tsx`, `apps/web/src/pages/not-found/NotFoundPage.test.tsx`
- change `apps/web/src/App.tsx`
- create `apps/web/CLAUDE.md`

## Approach

1. **`NotFoundPage`** (story § UI states): `<h1>` "Page not found", a paragraph "The page you are looking for does not exist.", and `<Link to="/">` "Go to the home page". Style it with Tailwind like `AppShell` (FE-01).
2. **`App.tsx`:** add the child route `{ path: '*', element: <NotFoundPage /> }` under the `AppShell` layout route, so the header stays visible.
3. **`NotFoundPage.test.tsx`:** TC-7.1 with `renderApp('/does-not-exist')` from `src/test/render.tsx` (FE-01). Find the elements by role and name.
4. **`apps/web/CLAUDE.md`:** short rules, one bullet each, covering every point of design §10:
   - **List of web pages**, a table with route, page folder, epic and story. For now one row: `*` → `src/pages/not-found/` → E01 S01.2. FE-03 adds `/`; every later epic adds its rows.
   - One folder per route in `src/pages/`; shared UI in `src/components/`.
   - Data access only through TanStack Query hooks in `src/api/`, which call `apiGet` and validate every response with the shared schema. Never call `fetch` directly from a component.
   - Every page handles loading, empty, error and success; status text uses `role="status"`, errors use `role="alert"`.
   - Mobile-first at 375 px with no horizontal scrolling; accessible markup (a label on every input, alt text, headings in order, keyboard reachable); hazard information never by colour alone.
   - Tailwind only, no other CSS framework.
   - Component tests (`*.test.tsx` next to the code) with Testing Library and MSW handlers built from the shared schemas; find elements by role or label. Titles start with the test-case identifier.
   - The commands: `pnpm --filter @labsafe/web test`, `pnpm dev`, `pnpm verify`.
   FE-03 adds the API client and MSW; describe them here already as the rule (`src/api/client.ts`, `src/test/msw.ts`).
5. **Proof of work:** `pnpm verify`. By hand: `pnpm dev`, then open `http://localhost:5173/does-not-exist`.

## Out of scope

The home page and the link's destination content (FE-03; TC-7.2 is automated there).

## Implementation notes

<!-- Filled in by the dev: what was done, deviations from this ticket or the design and why. -->
