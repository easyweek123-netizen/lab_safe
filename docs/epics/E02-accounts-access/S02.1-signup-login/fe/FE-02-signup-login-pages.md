---
id: FE-02
story: S02.1
layer: fe
status: done
depends_on: [BE-03, FE-01]
covers: [AC1, AC2, AC3, AC5, AC6, AC9, AC15, AC16]
updated: 2026-11-24
---

# FE-02 Sign-up and login pages

**Goal:** the `/signup` and `/login` pages, with field messages, server errors, the submitting state and the safe `next` redirect. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/web/src/pages/signup/SignUpPage.tsx`, `SignUpPage.test.tsx`
- create `apps/web/src/pages/login/LoginPage.tsx`, `LoginPage.test.tsx`, `safe-next.ts`, `safe-next.test.ts`
- change `apps/web/src/App.tsx`
- change `apps/web/package.json` (`react-hook-form`, `@hookform/resolvers`)
- change `apps/web/CLAUDE.md` (page list: `/signup`, `/login`)

## Constraints

- Forms use react-hook-form (design doc D8) with `SignUpRequest` and `LoginRequest` from `@labsafe/shared`. If the resolver package does not support Zod 4, validate with the schema's `safeParse` on submit instead and note it.
- Server `fields` errors appear next to their inputs (AC2, AC3); 401 `INVALID_CREDENTIALS` and 500 or network errors appear as an `alert` above the button, and the typed values stay (AC6, AC15). The password input is `type="password"` with `autocomplete` `new-password` or `current-password`.
- `safe-next.ts` accepts only a path that starts with one `/` (not `//`, not a scheme); anything else means `/contribute` (AC9).
- A signed-in visitor is sent to `/contribute` (AC16); while `me` is loading nothing is shown but `status` "Loading…".
- Texts exactly as in the story; one `h1` per page ("Sign up", "Log in"); every input has a label; tap targets at least 44 px; no sideways scroll at 375 px.
- Follow `HomePage.tsx` for states and `renderApp` with MSW for tests; titles start with `S02.1 AC<n>`.
- Schema change: no.

## Out of scope

The gate and the contributor area (FE-03). Password reset.

## Implementation notes

**Files changed:**

- apps/web/src/pages/signup/SignUpPage.tsx
- apps/web/src/pages/signup/SignUpPage.test.tsx
- apps/web/src/pages/login/LoginPage.tsx
- apps/web/src/pages/login/LoginPage.test.tsx
- apps/web/src/pages/login/safe-next.ts
- apps/web/src/pages/login/safe-next.test.ts
- apps/web/src/components/TextField.tsx
- apps/web/src/App.tsx
- apps/web/package.json
- pnpm-lock.yaml
- apps/web/CLAUDE.md

**Differences from the ticket:**

- `@hookform/resolvers` 7.0.8 (with `react-hook-form` 7.92.0) supports Zod 4, so the forms use `zodResolver` with the shared schemas (no `safeParse` fallback).
- New shared component `src/components/TextField.tsx` (label, input, message as the input's accessible description via `aria-describedby`), used by both pages.
- A signed-in visitor on `/login` is sent to the safe `next` value, which is `/contribute` when there is none (AC16); this way the redirect after login and the redirect of an already signed-in visitor are the same target.
- If `GET /auth/me` fails, `/signup` and `/login` show the form (the visitor is treated as anonymous, as in the header); the story names no error state for these pages.
- Until FE-03 adds `/contribute`, the tests check that the browser is at `/contribute`; the waiting notice text of AC1 and the `/contribute` redirect of AC9 are checked in FE-03. No Playwright spec: the journey and the 375 px checks of the new pages are FE-03's `e2e/tests/accounts.spec.ts` (AC17).
