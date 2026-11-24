---
id: FE-02
story: S02.2
layer: fe
status: done
depends_on: [BE-01, BE-02, FE-01]
covers: [AC3, AC6, AC7, AC10, AC12]
updated: 2026-11-24
---

# FE-02 Sign-up review journey test

**Goal:** prove in a real browser, at both widths, that the setup admin approves and rejects sign-ups and that the person sees the result on their next page load. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `e2e/tests/sign-up-review.spec.ts`
- create `e2e/helpers/accounts.ts` (sign up a unique person, log in as the setup admin)
- change `e2e/tests/accounts.spec.ts` only to reuse the new helpers

## Constraints

- Two browser contexts per test: the person and the admin. The person never logs in again between the admin's action and the reload (C3, C4).
- Proves AC3 (setup admin from `e2e/test-env.ts` reaches `/admin/sign-ups`), AC6 and AC7 end to end, AC10 for an approved contributor ("No access") and for an anonymous visitor (redirect to log in), and AC12's no-sideways-scroll check on `/admin/sign-ups` and the "No access" notice.
- Every test uses its own unique email; the tests must pass in either project order, since both share one database.
- Follow `smoke.spec.ts` and S02.1's `accounts.spec.ts`; titles start with `S02.2 AC<n>`.
- Schema change: no.

## Out of scope

Role changes (S02.3).

## Implementation notes

**Files changed:**

- e2e/helpers/accounts.ts
- e2e/tests/sign-up-review.spec.ts
- e2e/tests/accounts.spec.ts
- e2e/tsconfig.json

**Differences from the ticket:**

- `e2e/helpers/accounts.ts` holds every shared step: `newAccount`, `signUp`, `signUpPending`, `logIn`, `logInAsAdmin` (`TEST_ADMIN`), `openSignUps` (the header's "Sign-ups" link), `signUpRow` (the row found by its unique email, since other tests' pending sign-ups are listed too), `approveAsSetupAdmin` (in a browser context of its own), `expectWaitingNotice`, `expectContributorArea`, `banner` and `hasNoHorizontalScroll`. `accounts.spec.ts` now imports them instead of defining its own.
- S02.1 review F3 is closed: "S02.1 AC17 the contributor area has no horizontal scroll" no longer fakes `GET /api/auth/me`. It signs up a real person, has the setup admin approve them in a second browser context, and checks `/contribute` with the person's own session. The main session can remove F3 from S02.1's "Known gaps".
- `e2e/tsconfig.json` includes `helpers`, so the type check covers the new folder.
- Extra tests beyond the ticket: AC10 for a pending account on `/admin/sign-ups` (waiting notice, no "Sign-ups" link), AC7's "Cancel" step and the later sign-up with the same email (in a fresh browser context), and AC12 on `/admin/sign-ups` with a long unbroken name and email.
- The admin's extra contexts come from `browser.newContext()`, which takes the project's `use` options (base URL, 375 px or 1280 px window), so the admin side is also checked at both widths.
- The specs passed on their first run, because FE-01 had already built the pages; they could not be seen failing first.
