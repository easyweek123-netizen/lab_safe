---
id: FE-02
story: S02.3
layer: fe
status: done
depends_on: [BE-01, FE-01]
covers: [AC3, AC4, AC10, AC12]
updated: 2026-11-24
---

# FE-02 Role sharing journey test

**Goal:** prove in a real browser, at both widths, that a promoted person reaches the admin pages on their next page load and loses them again after demotion. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `e2e/tests/admin-roles.spec.ts`
- change `e2e/helpers/accounts.ts` (approve a person as the setup admin)

## Constraints

- Two browser contexts: the setup admin and a newly signed-up, approved person; the person never logs in again between the admin's action and the reload (C7).
- Proves AC12's journey, AC10 for an approved contributor on `/admin/accounts`, and the no-sideways-scroll check on `/admin/accounts`.
- Every test ends with the person demoted again, so the setup admin's view of "who is an admin" stays predictable for the other specs. The last-admin case (AC5, AC6) is proven by the API and component tests, not here, because the e2e database is shared.
- Follow S02.2's `sign-up-review.spec.ts`; titles start with `S02.3 AC<n>`.
- Schema change: no.

## Out of scope

Anything not in AC12 or AC10.

## Implementation notes

**Files changed:**

- e2e/tests/admin-roles.spec.ts
- e2e/helpers/accounts.ts

**Differences from the ticket:**

- `approveAsSetupAdmin` already existed (S02.2 FE-02), so `accounts.ts` instead gains `openAccounts`, `accountRow`, `changeRole` (presses "Make admin <name>" or "Remove admin <name>" and waits for the `status` and the row's new role), `changeRoleAsSetupAdmin` (the same in a context of its own) and `signUpApproved` (sign up, then `approveAsSetupAdmin`).
- The journey test keeps track of whether the person is still an admin and, in a `finally`, demotes them through a fresh setup-admin context if a step failed, so the shared database keeps one admin for the other specs.
- Besides the approved contributor, AC10 is also checked for an anonymous visitor (sent to `/login?next=/admin/accounts`, then lands there after logging in as admin) and a pending account (waiting notice). A second no-sideways-scroll test uses an approved person with a long unbroken name and email, as on `/admin/sign-ups`.
- The page was built by FE-01, so the new spec passed on its first run; it did not fail first.
- `pnpm e2e`: 52 passed (26 per width). `pnpm verify`: passes.
