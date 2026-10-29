---
id: E06
title: Search and filters
status: planned
covers: [US1, US2, NFR1, NFR3, NFR2]
depends_on: [E04]
branch:
updated: 2026-10-29
---

# E06 Search and filters

## Goal

A student finds the right safety page within 3 seconds, on a phone or a desktop.

Requirements: US1, US2, NFR1, NFR3. Also final checks for NFR2 (mobile).

## Scope

- The public search page as the home page: search by name, manufacturer or model, ignoring upper or lower case, backed by a `pg_trgm` index.
- Filters for category, room, hazard type, protective equipment and hazard level, combinable, with an active-filter count and "clear all".
- Result cards with photo, room and hazard badge; a clear "no results" message.
- A test seed of at least 50 pages, and the timed Playwright test for M1 and M2.
- Lighthouse accessibility checks (M5) on the search page and a safety page, and the accessibility fixes they need (badges never colour-only, alt text).

## Out of scope

Typo-tolerant or "did you mean" search.

## Exit criteria

Each one can be checked by the user, in a browser or by running a command.

- [ ] Searching "rotary" or "R-300" finds the rotary evaporator. Combining filters narrows the results, and "clear all" resets them.
- [ ] `pnpm e2e` reports M1 ≤ 3 s and M2 ≤ 1 s at p95 over 20 queries with 50 or more seeded pages.
- [ ] Lighthouse accessibility on mobile scores ≥ 90 on the search page and on a safety page.
- [ ] Pending and deleted pages never appear in results (M3).
- [ ] `pnpm verify` and `pnpm e2e` pass.

## Stories

| ID  | Story | Type | Covers | Status |
| --- | ----- | ---- | ------ | ------ |

## Change requests

## Verification

<!-- architect, /epic-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets -->

## Open questions

## Changes
