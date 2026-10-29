---
status: draft
updated: YYYY-MM-DD
---

# E02 design

**Covers:** US6, US10, US14 · **Depends on:** E01 · Keep this at most ~150 lines plus diagrams: decisions and shapes, not detail.

## Data

```mermaid
erDiagram
```

Migrations, and each invariant with how it is enforced (constraint / transaction / guard).

## Contract

| Method | Path | Auth | Request → Response | Errors |
| ------ | ---- | ---- | ------------------ | ------ |

## Flows

```mermaid
sequenceDiagram
```

Only for non-trivial flows.

## Screens and states

| Route | Screen | States (loading / empty / error / success) | Roles |
| ----- | ------ | ------------------------------------------ | ----- |

## Authorization matrix

| Endpoint / screen | anonymous | pending | contributor | admin |
| ----------------- | --------- | ------- | ----------- | ----- |

## Decisions

Technical choices for this epic that are expensive to undo later.

| #   | Decision | Why | Alternatives considered |
| --- | -------- | --- | ----------------------- |

## Risks

## Story outline

1. S02.1 … (the demoable outcome) · depends on: none

## Open questions

## Changes
