---
id: E05
title: Page updates and deletion
status: planned
covers: [US8, US13, R6]
depends_on: [E04]
branch:
updated: 2026-10-29
---

# E05 Page updates and deletion

## Goal

Published pages can change without students ever seeing an unapproved version, and pages for instruments that are gone can be removed.

Requirements: US8, US13, R6.

## Scope

- "Suggest an update", pre-filled from the published version.
- At most one pending update per page (R6), with an "awaiting review" message for others.
- The review queue marks updates and links to the live version.
- Approving swaps the published version in one transaction and sets a new last-approved date.
- Admin delete with a confirmation step (a soft delete). Afterwards the page, its photo and its pending updates disappear from public view and from the queue.

## Out of scope

Change history (CAN DO, so OUT).

## Exit criteria

Each one can be checked by the user, in a browser or by running a command.

- [ ] While an update is pending, students still see the old version. After approval they see the new version and the new date.
- [ ] A second contributor trying to update the same page sees "an update is awaiting review".
- [ ] After deletion, the page URL and the photo URL return "not found", and the update disappears from the queue.
- [ ] `pnpm verify` and `pnpm e2e` pass.

## Stories

| ID  | Story | Type | Covers | Status |
| --- | ----- | ---- | ------ | ------ |

## Change requests

## Verification

<!-- architect, /epic-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets -->

## Open questions

## Changes
