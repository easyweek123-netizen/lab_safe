---
id: E02
title: Accounts and access
status: planned
covers: [US6, US10, US14, NFR4, NFR5]
depends_on: [E01]
branch:
updated: 2026-10-29
---

# E02 Accounts and access

## Goal

Contributors can join only with an admin's approval, and admins can share the admin role safely.

Requirements: US6, US10, US14, NFR4, NFR5.

## Scope

- The `users` and `sessions` tables; scrypt password hashing; the session cookie.
- Sign up, log in, log out, and "who am I".
- The guards (`@Public`, `@Contributor`, `@Admin`, deny by default) and the `Origin` check.
- The first admin is created from configuration at start-up.
- Pages: sign up, log in, "waiting for approval", and a header showing the logged-in user.
- Admin pages: approve or reject pending sign-ups; promote or demote admins, where the last admin can't be demoted.
- Only name, email and password hash are stored (NFR5).

## Out of scope

Password reset, emails, and anything about safety pages.

## Exit criteria

Each one can be checked by the user, in a browser or by running a command.

- [ ] A new sign-up sees "waiting for approval" and cannot reach the contributor area.
- [ ] After an admin approves the account, the same person logs in and reaches the (still empty) contributor area. A rejected account never can.
- [ ] An admin promotes a contributor to admin and demotes them again. Demoting the last admin shows an error.
- [ ] Automated tests show that an anonymous visitor, a pending account and a contributor are each refused every admin endpoint.
- [ ] `pnpm verify` and `pnpm e2e` pass.

## Stories

| ID  | Story | Type | Covers | Status |
| --- | ----- | ---- | ------ | ------ |

## Change requests

## Verification

<!-- architect, /epic-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets -->

## Open questions

## Changes
