---
status: draft # draft | approved (set by /build-epic)
updated: YYYY-MM-DD
---

# E02 technical design

<!-- architect: about 150 lines plus diagrams. Decisions and shapes, not code. -->

## Data

<!-- New or changed tables, and where each rule is enforced: a constraint, a transaction or an access check. -->

```mermaid
erDiagram
```

## Endpoints

<!-- One row per endpoint. "Who may call" names roles; everyone else is refused. -->

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |

## Flows

<!-- A sequence diagram only for flows with more than one step. -->

```mermaid
sequenceDiagram
```

## Screens

<!-- One row per page. -->

| Route | Who sees it | Loading | Empty | Error | Success |
| ----- | ----------- | ------- | ----- | ----- | ------- |

## Who may do what

<!-- One row per endpoint or screen; ✓ allowed, ✗ refused. -->

| Endpoint or screen | anonymous | pending | contributor | admin |
| ------------------ | --------- | ------- | ----------- | ----- |

## Decisions

<!-- Only choices that are expensive to undo. -->

| #   | Decision | Why | Options considered |
| --- | -------- | --- | ------------------ |

## Risks

## Stories

<!-- In build order; each one something a user can try. -->

1. S02.1 … · delivers C1 · depends on: none

## Open questions

## Changes
