---
id: E04
title: Review and publish
status: planned
covers: [US3, US4, US9, US11, US12, R1]
depends_on: [E03]
branch:
updated: 2026-10-29
---

# E04 Review and publish

## Goal

Nothing reaches students without an admin's approval. Approved pages become public safety pages, and contributors learn the outcome.

Requirements: US3, US4, US9, US11, US12, R1.

## Scope

- The admin review queue, oldest first, with the contributor and the date.
- A preview that uses the same `SafetyPageView` as the public page; approve, or reject with a required note.
- Approving sets the published pointer in one transaction, along with the last-approved date and the approver.
- The public safety page at `/instruments/<slug>`: all fields, the four sections in order, and the key safety facts visible without scrolling on a phone.
- "My submissions" now shows approved or rejected status with the admin's note. A rejected page can be fixed and resubmitted.
- Anonymous leak tests (M3): pending and rejected pages, and their photos, are "not found".

## Out of scope

Updates to published pages and deletion (E05), search (E06).

## Exit criteria

Each one can be checked by the user, in a browser or by running a command.

- [ ] The admin sees the pending rotary evaporator in the queue, previews it, and rejects it with a note.
- [ ] The contributor sees "rejected" and the note, fixes the page and resubmits it.
- [ ] The admin approves it. An anonymous visitor opens `/instruments/rotary-evaporator` and sees every field, the four sections in order, and the last-approved date.
- [ ] At 375 px, the hazard level, training, hazards, protective equipment and emergency number are visible without scrolling.
- [ ] While pending or rejected, the page URL and photo URL return "not found" to an anonymous visitor.
- [ ] `pnpm verify` and `pnpm e2e` pass.

## Stories

| ID  | Story | Type | Covers | Status |
| --- | ----- | ---- | ------ | ------ |

## Change requests

## Verification

<!-- architect, /epic-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets -->

## Open questions

## Changes
