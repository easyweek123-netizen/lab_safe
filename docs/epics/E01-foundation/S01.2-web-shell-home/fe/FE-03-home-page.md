---
id: FE-03
story: S01.2
layer: fe
status: done
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

- **Done:** `src/api/client.ts` (`ApiError` with `status` and `code?`, and `apiGet`), `src/api/meta.ts` (`useMetaLists`, `staleTime: Infinity`), `src/test/msw.ts` (`metaListsFixture` parsed with `MetaListsResponse` from the shared constants and the rooms `LAB-101` and `LAB-102`, `handlers`, `server`), the MSW lifecycle in `src/test/setup.ts` (`onUnhandledRequest: 'error'`), `HomePage` with the loading, error and success states, and the `index` route under `AppShell`. `msw` 2.15 is a devDependency of `@labsafe/web`. `apps/web/CLAUDE.md` has the `/` row.
- **Tests:** `src/pages/home/HomePage.test.tsx` has TC-4.1, TC-5.1, TC-6.1, TC-6.2, TC-6.3 and TC-7.2. All pass, and so do TC-3.1, TC-3.2 and TC-7.1. `pnpm verify` passes.
- **By hand (dev database already migrated in S01.1, so no database command):** with `pnpm dev`, `http://localhost:5173/api/meta/lists` returned the four rooms through the Vite proxy. Headless Chromium at 375 px showed the heading, the purpose line, the four rooms and the 15 hazard types, with no sideways overflow (TC-9.1, TC-8.1 for `/`). The longest label wraps inside its box. With only the API process stopped (the proxy answered 502), the page showed "Couldn't load, try again." and a 44 px tall "Retry" button.
- **Difference: `role="alert"` is on the message only.** The ticket puts the button inside `<div role="alert">`. I put `role="alert"` on the `<p>` with the message, and the "Retry" button sits next to it in a plain `<div>`. That way screen readers announce only the message, not "Retry" as part of the alert. TC-6.1 and TC-6.3 check the alert's text and the button separately.
- **Difference: `apiGet` uses `safeParse` and throws `ApiError`** instead of `schema.parse`. A body that does not match the contract, or that is not JSON, is still an error (TC-6.2). Callers now always get an `ApiError` and never a raw `ZodError`. A network error becomes `ApiError` with status 0.
- **Addition: `allowBuilds` has `msw: false`** in `pnpm-workspace.yaml`. pnpm 11 asked for a decision about msw's postinstall script. That script only copies the browser service worker, which the tests do not use (they use `msw/node`).
- **Note:** the loading and error states have no `h1`, as the ticket and the story's UI states specify (the heading belongs to the success state).
- **Fix F1 (review):** while a Retry runs (`isError && isFetching`), `HomePage` shows the loading state (`status` "Loading…") instead of the old error, so the visitor sees that Retry is working and a failed Retry mounts a new, announced alert. TC-6.3 now holds the retry answer and checks for "Loading…" with no alert and no Retry button before the lists appear.
