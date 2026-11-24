# Documentation rules

The documents are the shared memory between the agents and the user. Keep them true, short and linked.

## Who writes what

```
docs/
  BRIEF.md                      product-manager · what to work on next
  prd/PRD.md                    product-manager · requirements, acceptance log
  technical-design/design-doc.md  architect · project-wide design and decisions
  epics/README.md               the list of epics
  epics/E02-<slug>/
    epic.md                     product-manager · requirements, rules, acceptance criteria (C1 …)
                                architect · story table, verification, changes
                                main session · status, build report
    design.md                   architect · the epic's technical design
    epic-review.md              architect · your feedback rounds
    S02.1-<slug>/
      story.md                  architect · acceptance criteria (AC1 …), design, verification
      be/BE-01-<slug>.md        architect · backend ticket (the developer fills in status and notes)
      fe/FE-01-<slug>.md        architect · frontend ticket
      review.md                 architect · code review rounds
      qa.md, qa/                qa-engineer · browser test runs, screenshots of failures
  _templates/                   copy these; don't invent sections
```

The user may change anything. The main session changes only statuses, "Known gaps", "Build report", and the `→ fixed` and `→ disputed` marks.

## Identifiers

`US<n>`, `R<n>`, `NFR<n>` requirements · `M<n>` metrics · `E<nn>` epic · `C<n>` epic criterion · `S<nn>.<n>` story · `AC<n>` story criterion · `BE-<nn>`, `FE-<nn>` tickets · `F<n>` finding · `B<n>` bug. Folders and files are `<identifier>-<slug>`, lowercase with hyphens.

## Frontmatter (checked by `node .claude/tools/docs-check.mjs`)

```yaml
# design.md
status: draft                 # draft | approved
updated: 2026-11-02
# epic.md
id: E02
title: Accounts and access
status: planned               # planned | in-progress | done
covers: [US6, US10]
depends_on: [E01]
branch: epic/E02-accounts-access
updated: 2026-11-02
# story.md
id: S02.1
epic: E02
title: Sign up and log in
type: feature
status: draft                 # draft | building | in-review | qa | done
covers: [US6]
updated: 2026-11-02
# ticket
id: BE-01
story: S02.1
layer: be                     # be | fe, matching the folder
status: todo                  # todo | doing | done
depends_on: []
covers: [AC1, AC2]
updated: 2026-11-02
```

Set `updated:` to today's date whenever you edit a document. Write absolute dates.

## Statuses

| Change | By |
| --- | --- |
| `design.md` → `approved`, epic → `in-progress` | the first `/build-epic` |
| story `building → in-review → qa → done` | `/build-epic` |
| ticket `todo → doing → done` | the developer |
| epic → `done` | `/complete-epic` |

## Rules

- Acceptance criteria are written `- **AC1** Given … When … Then …`. They freeze when `/build-epic` starts; after that only the user changes them.
- Every change to a document after it is approved gets a line in its "Changes" section.
- `design.md` stays under about 150 lines plus diagrams; a ticket fits on one screen. Diagrams in Mermaid.
- Link to other documents instead of copying them.
