---
id: S02.1
epic: E02
title: Sign up and log in
type: feature
status: draft
covers: [US6]
updated: YYYY-MM-DD
---

# S02.1 Sign up and log in

**As a** … **I want** … **so that** … · Design: [design.md](../design.md)

## Acceptance criteria

- **AC1** Given … When … Then …
- **AC2** Given … When … Then …

## Test cases

| TC     | AC  | Role      | Preconditions / data | Steps | Expected      | Type      | Ticket |
| ------ | --- | --------- | -------------------- | ----- | ------------- | --------- | ------ |
| TC-1.1 | AC1 | anonymous | none                 | 1. …  | …             | auto: e2e | FE-01  |
| TC-1.2 | AC1 | anonymous | email already taken  | …     | 409 + message | auto: api | BE-01  |
| TC-2.1 | AC2 | anonymous | phone (375 px)       | …     | readable form | manual    | —      |

## API contract

Shared schemas (`<package/file>`): `SignUpRequest { email, password }`, …

| Method | Path | Auth | Request → Response | Status codes |
| ------ | ---- | ---- | ------------------ | ------------ |

## UI states

## Tickets

In build order (BE first; the first BE ticket implements the contract):

1. [BE-01 …](be/BE-01-slug.md)
2. [FE-01 …](fe/FE-01-slug.md)

## Out of scope

## Known gaps

## Verification

<!-- architect, /story-done: **GREEN** | **RED** · YYYY-MM-DD, then evidence bullets (file:line) -->

## Changes
