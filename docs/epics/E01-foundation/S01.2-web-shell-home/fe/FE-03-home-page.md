---
id: FE-03
story: S01.2
layer: fe
status: todo
depends_on: [BE-01, FE-01, FE-02]
covers: [AC4, AC5, AC6, AC7, AC9]
updated: 2026-10-29
---

# FE-03 Home page with the lists from the API

**Goal:** add the typed API client, the `useMetaLists` hook, MSW for component tests, and the home page with its loading, error and success states. **Automates:** TC-4.1, TC-5.1, TC-6.1, TC-6.2, TC-6.3, TC-7.2. **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `apps/web/src/api/client.ts`, `apps/web/src/api/meta.ts`
- create `apps/web/src/test/msw.ts`
- change `apps/web/src/test/setup.ts`, `apps/web/package.json` (devDependency `msw` 2)
- create `apps/web/src/pages/home/HomePage.tsx`, `apps/web/src/pages/home/HomePage.test.tsx`
- change `apps/web/src/App.tsx`, `apps/web/CLAUDE.md` (page list: add `/` → `src/pages/home/` → E01 S01.2, "replaced by search in E06")

## Approach

1. **`src/api/client.ts`:** `class ApiError extends Error { status; code? }` and `apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T>`.
   - It fetches `new URL('/api' + path, window.location.origin)` (an absolute URL, so it also works under jsdom) with `Accept: application/json`.
   - On a non-2xx answer, it reads the body with `ErrorResponse.safeParse` and throws `ApiError` with the status and code.
   - On a 2xx answer, it returns `schema.parse(await res.json())`, so a body that does not match the contract is an error too (TC-6.2).
   Later epics add `apiPost` and so on next to it.
2. **`src/api/meta.ts`:** `useMetaLists()` = `useQuery({ queryKey: ['meta', 'lists'], queryFn: () => apiGet('/meta/lists', MetaListsResponse), staleTime: Infinity })`.
3. **`src/test/msw.ts`:** `metaListsFixture` = `MetaListsResponse.parse({…})`, built from the shared constants plus two rooms (`LAB-101` "Teaching lab 1", `LAB-102` "Teaching lab 2", with fixed UUIDs). Export `handlers` (a default `GET */api/meta/lists` that returns the fixture) and `server = setupServer(...handlers)`. In `setup.ts`: `server.listen({ onUnhandledRequest: 'error' })` before all tests, `server.resetHandlers()` after each, `server.close()` after all. TC-3.1 from FE-01 must still pass now that `/` loads data.
4. **`HomePage`** (story § UI states, design §8):
   - `isPending`: `<p role="status">Loading…</p>`.
   - `isError`: `<div role="alert">` with "Couldn't load, try again." and a `<button>` "Retry" that calls `refetch()`.
   - success: `<h1>` "LabSafe", the purpose line, an `<h2>` "Lab rooms" with a `<ul>` of `CODE · Name`, and an `<h2>` "Hazard types" with a `<ul>` of labels.
   There is no empty state: the lists are never empty. Mobile-first: lists wrap and never overflow at 375 px.
5. **`App.tsx`:** add `{ index: true, element: <HomePage /> }` under the shell.
6. **`HomePage.test.tsx`:** use `renderApp` from `src/test/render.tsx` (FE-01) and `server.use(…)` per test:
   - TC-4.1: a handler that never resolves.
   - TC-5.1: the default fixture.
   - TC-6.1: 500 with an `ErrorResponse` body.
   - TC-6.2: 200 `{ hazardTypes: 'oops' }`.
   - TC-6.3: `HttpResponse.error()` once, then the fixture; click "Retry" with `user-event`.
   - TC-7.2: start at `/does-not-exist` and click "Go to the home page".
   Assert only what the user sees, found by role and name.
7. **Proof of work:** `pnpm verify`. By hand, after the user approves `pnpm db:migrate` on the development database: `pnpm dev`, then open `http://localhost:5173` (TC-9.1), with the API stopped (error state), and at 375 px (TC-8.1).

## Out of scope

Search and filters (E06). Prefetching or caching beyond TanStack Query defaults. End-to-end tests (S01.3).

## Implementation notes

<!-- Filled in by the dev: what was done, deviations from this ticket or the design and why. -->
