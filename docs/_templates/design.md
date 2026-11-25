---
status: draft # draft | approved (set by /build-epic)
updated: YYYY-MM-DD
---

# E02 technical design

| **Author** | architect |
| --- | --- |
| **Status** | see `status:` above |
| **Date** | YYYY-MM-DD |
| **Reviewer** | the user (approves by running `/build-epic`) |

<!-- architect: about 150 lines plus diagrams. Decisions and shapes, not code. -->

## Objective

<!-- One short paragraph: what this epic changes and why. -->

## Background

<!-- The problem, what already exists in the code (earlier epics), and what is missing. -->

## Requirements

<!-- The requirement identifiers and epic criteria (C1 …) this design serves. Link to epic.md; don't copy it. -->

## Design

<!-- The final state: an architecture or flow diagram, and a sequence diagram only for flows with more than one step. -->

```mermaid
sequenceDiagram
```

## Technical implementation

<!-- For each part: the proposed solution, the tradeoffs considered, and the expected impact. -->

### Data models

<!-- New or changed tables and fields, how they link to existing ones (foreign keys), migrations,
     and where each rule is enforced: a constraint, a transaction or an access check. -->

```mermaid
erDiagram
```

### API layer

<!-- One row per endpoint. "Who may call" names roles; everyone else is refused. -->

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |

### UI layer

<!-- One row per page; new components and anything tricky. -->

| Route | Who sees it | Loading | Empty | Error | Success |
| ----- | ----------- | ------- | ----- | ----- | ------- |

### Testing

<!-- What the unit, integration and e2e tests cover, and what the qa-engineer checks by hand in the browser. -->

## Additional considerations

### Privacy

<!-- Personal data stored or exposed, how long it is kept, how it is deleted (NFR5, GDPR). -->

### Security

<!-- Sensitive data, new attack vectors (injection, XSS, CSRF, uploads) and how they are mitigated. -->

#### Who may do what

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

## References

<!-- Sources used, earlier designs, research links. -->

## Open questions

## Changes
