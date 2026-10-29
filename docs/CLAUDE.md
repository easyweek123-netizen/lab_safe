# Documentation rules

The documents are the shared memory between the agents and the user. Keep them true, short, and linked to each other instead of copied. The words used here (epic, story, ticket, acceptance criterion, test case, finding, bug, change request, decision) are defined in the root `CLAUDE.md`.

## Where each document lives and who writes it

```
LabSafe_Required_Features.pdf            (repository root) the course brief: input only, never edited
docs/
  BRIEF.md                               lead · where we stand and what to do today
  prd/PRD.md                             product-manager · the requirements document: every requirement, impact metrics, acceptance log
  technical-design/design-doc.md         architect · project-wide technical design and project-wide decisions
  epics/README.md                        architect · the frozen list of epics
  epics/E02-accounts-access/             one folder per epic
    epic.md                              architect · goal, scope, exit criteria, list of stories
    design.md                            architect · this epic's technical design and decisions (written in plan mode)
    epic-review.md                       fullstack-reviewer · review rounds for the whole epic
    qa.md, qa/                           qa-engineer · browser test runs for the whole epic, screenshots
    CR-01-update-reason.md               product-manager · a change request that affects this epic
    S02.1-sign-up-and-login/             one folder per story
      story.md                           story-planner · acceptance criteria, test cases, contract, list of tickets; architect adds the verification
      be/BE-01-auth-endpoints.md         story-planner · a backend ticket (the developer fills in status and implementation notes)
      fe/FE-01-auth-pages.md             story-planner · a frontend ticket
      review.md                          fullstack-reviewer · review rounds for this story (the user ticks findings)
      qa.md, qa/                         qa-engineer · browser test runs for this story, screenshots (the user ticks bugs)
  _templates/                            copy these templates; do not invent new sections
```

## What others may change in a document they do not own

The user may change anything.

| Document                          | Owner              | Others may change only…                                                                                     |
| --------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `PRD.md`                          | product-manager    | nothing                                                                                                      |
| `design-doc.md`                   | architect          | nothing                                                                                                      |
| `epics/README.md`                 | architect          | the main session and the lead: the Status column                                                            |
| `epic.md`                         | architect          | the main session and the lead: `status`, `branch`, the status cells of the story table; story-planner: rows of the story table; product-manager: ticks of the exit criteria during `/epic-done` |
| `design.md`                       | architect          | nothing                                                                                                      |
| `CR-<nn>-*.md`                    | product-manager    | nothing                                                                                                      |
| `story.md`                        | story-planner      | the main session and the lead: `status` and "Known gaps"; architect: the "Verification" section              |
| ticket files                      | story-planner      | the developer working on it: `status` and "Implementation notes"; the lead: `status`                         |
| `review.md`, `epic-review.md`     | fullstack-reviewer | `/fix`: the `→ fixed` and `→ disputed` marks                                                                 |
| `qa.md`                           | qa-engineer        | `/fix`: the `→ fixed` and `→ disputed` marks                                                                 |
| `BRIEF.md`                        | lead               | nothing                                                                                                      |

## Identifiers

| Thing                           | Identifier format                                                                                          | Example     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------- |
| Requirement                     | `US<n>` user story (keeps the brief's numbering), `R<n>` rule, `NFR<n>` non-functional requirement         | `US8`       |
| Impact metric                   | `M<n>`                                                                                                     | `M2`        |
| Epic                            | `E<nn>`                                                                                                    | `E02`       |
| Story                           | `S<epic number>.<n>`                                                                                       | `S02.1`     |
| Ticket                          | `BE-<nn>` (backend) or `FE-<nn>` (frontend), numbered inside its story                                     | `BE-01`     |
| Acceptance criterion            | `AC<n>`, numbered inside its story                                                                         | `AC3`       |
| Test case                       | `TC-<acceptance criterion number>.<n>`, numbered inside its story                                          | `TC-3.2`    |
| Change request                  | `CR-<nn>`, numbered inside its epic; written with the epic when referenced from elsewhere                  | `E03/CR-01` |
| Review finding                  | `F<n>`, numbered inside its review file, never reused                                                      | `F7`        |
| Browser-test bug                | `B<n>`, numbered inside its `qa.md`, never reused                                                          | `B2`        |

Folder and file names are `<identifier>-<slug>`. The slug is lowercase words joined by hyphens, with no spaces. A slug never changes after creation. When you mention another document, write its identifier and add a relative link.

## Frontmatter

Every document below starts with this frontmatter. `node .claude/tools/docs-check.mjs` checks it.

```yaml
# PRD.md, design-doc.md, design.md
status: draft            # draft | approved
updated: 2026-11-02
# epics/README.md
frozen: true             # true once the user approved the list of epics
updated: 2026-11-02
# epic.md
id: E02
title: Accounts and access
status: planned          # planned | planning | in-progress | epic-review | done
covers: [US6, US10, US14]   # requirement identifiers from the requirements document
depends_on: [E01]        # epics that must be done first
branch: epic/E02-accounts-access   # empty until /epic-design creates the branch
updated: 2026-11-02
# story.md
id: S02.1
epic: E02
title: Sign up and log in
type: feature            # feature (planned work) | change (comes from a change request)
status: draft            # draft | building | in-review | qa | done
covers: [US6]            # must be a subset of the epic's covers
updated: 2026-11-02
# ticket (be/BE-01-*.md, fe/FE-01-*.md)
id: BE-01
story: S02.1
layer: be                # be (backend) | fe (frontend); must match the folder
status: todo             # todo | doing | done
depends_on: []           # other tickets of the same story that must be done first, e.g. [BE-01]
covers: [AC1, AC2]       # acceptance criteria of the same story
updated: 2026-11-02
# change request (CR-01-*.md)
id: CR-01
epic: E03
status: proposed         # proposed | applied | rejected
updated: 2026-11-02
```

Whenever you edit a document, set `updated:` to today's date. Always write absolute dates (`2026-11-02`), never "yesterday" or "last week".

## How the checker reads document bodies

- **Requirements document:** table rows whose first cell is the requirement identifier (`| US6 | … | MUST | … |`), in a table whose header has a `Priority` column. Priority is MUST, SHOULD or OUT.
- **Acceptance criteria in a story:** list items that start with the bold identifier: `- **AC1** Given … When … Then …`.
- **Test cases in a story:** one table with the columns `TC | AC | Role | Preconditions / data | Steps | Expected | Type | Ticket`.
  - `Type` is `auto: unit`, `auto: api` (backend integration test), `auto: web` (frontend component test), `auto: e2e` (end-to-end browser test), or `manual` (checked by hand in the browser).
  - An automated test case names the one ticket that automates it (for example `BE-01`). A manual test case uses `—`.
- **Verification:** the `## Verification` section of `story.md` or `epic.md` contains `**GREEN**` or `**RED**`.

## Who changes which status

| Status change                                 | Done by                                                     |
| --------------------------------------------- | ----------------------------------------------------------- |
| epic `planned → planning`                     | `/epic-design`, after the user approves the design          |
| epic `→ in-progress`                          | the first `/build` in the epic, or applying a change request that reopens it |
| epic `→ epic-review`, then `→ done`           | `/review` on the epic, then `/epic-done`                    |
| story `draft → building`                      | the first `/build` of the story                             |
| story `→ in-review`, `→ qa`, `→ done`         | `/review`, `/qa`, `/story-done` (only when the architect says GREEN) |
| ticket `todo → doing → done`                  | the developer agent working on the ticket                   |

## Rules

- **Traceability.** Every requirement in the requirements document is covered by an epic; every epic requirement is covered by a story; every story has acceptance criteria; every acceptance criterion has test cases; every automated test case is owned by a ticket and has a test named after it. The checker enforces every link it can see.
- **When things freeze:**
  - The list of epics freezes when the user approves `/epics`.
  - An epic's `design.md` freezes when `/epic-stories` runs.
  - A story's acceptance criteria and test cases freeze at its first `/build`.
  - After that, change them only through `/change-request`, or when the user asks for it in `/fix`. Record every such change in the document's "Changes" section.
- **Decisions.** A project-wide decision goes in the "Decisions" section of `design-doc.md`. A decision that only matters for one epic goes in the "Decisions" section of that epic's `design.md`.
- **Keep it short.** An epic's `design.md` is at most about 150 lines plus diagrams. A ticket fits on about one screen. Draw diagrams with Mermaid.
- **Link, don't copy.** A ticket links to its story's contract; a story links to its epic's design.
