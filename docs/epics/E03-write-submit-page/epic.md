---
id: E03
title: Write and submit a safety page
status: planned
covers: [US7, R3, R4, R5]
depends_on: [E02]
branch:
updated: 2026-10-29
---

# E03 Write and submit a safety page

## Goal

A contributor can write a complete, structured safety page and submit it. The page is saved as pending and stays invisible to everyone else.

Requirements: US7, R3, R4, R5.

## Scope

- Tables: `instruments`, `instrument_revisions`, `revision_hazards`, `revision_protective_equipment`, `photos`.
- Photo upload: at most 5 MB, JPEG or PNG, checked by content; re-encoded with `sharp`, which strips location data.
- The new-page form with every PRD §4.1 field: identity; risk at a glance; hazards with notes or "no significant hazards"; protective equipment with notes or "standard lab attire only"; GHS pictograms; the four guideline sections with their prompts; emergency phone and emergency equipment.
- The R5 hazard-level definitions shown next to that field.
- Validation that names every missing field (R3); fixed lists only (R4); "training required" can't be combined with a Low hazard level (R5). These rules hold in both the shared schema and database constraints.
- "My submissions": the contributor's pages with status "pending"; they can open and edit a pending page.
- Anonymous visitors and other contributors get "not found" for a pending page's data and photo.

## Out of scope

The review queue, approving and rejecting, the public page (all E04); updating published pages (E05).

## Exit criteria

Each one can be checked by the user, in a browser or by running a command.

- [ ] A contributor creates a "Rotary evaporator" page with a photo and submits it. It appears in "My submissions" as pending.
- [ ] Submitting with fields missing lists every missing field. "Training required" combined with Low is refused.
- [ ] An anonymous visitor and another contributor get "not found" for the pending page's photo URL.
- [ ] A downloaded photo contains no GPS data.
- [ ] `pnpm verify` and `pnpm e2e` pass.

## Stories

| ID  | Story | Type | Covers | Status |
| --- | ----- | ---- | ------ | ------ |

## Change requests

## Verification

<!-- architect, /epic-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets -->

## Open questions

## Changes
