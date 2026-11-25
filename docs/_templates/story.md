---
id: S02.1
epic: E02
title: Sign up and log in
type: feature
status: draft # draft | building | in-review | qa | done
covers: [US6] # a subset of the epic's covers
points: 3 # story points: 1 | 2 | 3 | 5 | 8
updated: YYYY-MM-DD
---

# S02.1 Sign up and log in

| **Status** | see `status:` above |
| --- | --- |
| **Story points** | see `points:` above |
| **Epic criteria** | C1, C2 |
| **Design** | [design.md](../design.md) |
| **UX/UI designs** | none \| link |
| **Dependencies** | none \| S02.0 (why) |

## User story

As a [type of user], I want [their goal], so that [the benefit].

<!-- architect: name a clear user, the goal rather than the solution, and why it matters. -->

## Acceptance criteria

<!-- architect: the conditions under which this story is complete. Clear, testable, about outcomes,
     not implementation. Cover the successful path, invalid input, loading, empty and error states,
     and every role that must be refused. Keep the bold identifier at the start of each line
     (the docs checker reads it); put the details as sub-bullets. -->

- **AC1** Given …, When …, Then ….
  - detail or example
  - detail or example

## Out of scope

<!-- What this story does NOT include, so nobody builds beyond it. -->

## API contract

<!-- Exact schema names and fields in packages/shared. -->

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |

## Approach

<!-- The modules and files this story touches, and the existing code whose pattern to follow. -->

## Tickets

<!-- Backend first; the first backend ticket creates the contract. -->

1. [BE-01 …](be/BE-01-slug.md)
2. [FE-01 …](fe/FE-01-slug.md)

## Known gaps

<!-- /build-epic: minor findings and bugs left unfixed, with their identifiers. -->

## Verification

<!-- architect, on APPROVE: **GREEN** · date, then the evidence (file:line). -->

## Changes
