---
description: Plan mode. The architect proposes the ordered list of epics following your guidance, or revises the existing list. On approval it freezes the list and creates or updates one folder per epic.
argument-hint: '"<how to split and order the work>"  or, for a revision, "<what to change>"'
---

Arguments: `$ARGUMENTS`

## Step 1: Check

1. `docs/prd/PRD.md` and `docs/technical-design/design-doc.md` must both have `status: approved`. If not, STOP and name the missing one.
2. If `docs/epics/README.md` exists with `frozen: true`, STOP with:

   > The list of epics is frozen.
   > - To revise it before any epic is designed: set `frozen: false` in `docs/epics/README.md` (or edit the epic files directly), then run `/epics "<what to change>"`.
   > - Once an epic's design or build has started: use `/change-request "<the change>"`.

3. **First draft or revision?** If `docs/epics/README.md` or any `docs/epics/E<nn>-<slug>/epic.md` already exists, this is a **revision**. Otherwise it's a first draft.

## Step 2: Draft in plan mode

1. If you are not in plan mode, enter it with EnterPlanMode.
2. Read `.claude/agents/architect.md` and act as that role in Mode 2 (list of epics).
3. Inputs:
   - the requirements document and the project-wide technical design;
   - **on a revision:** the existing `docs/epics/README.md` and every existing `epic.md`;
   - the user's guidance or feedback from the arguments. Follow it.
4. Write the plan:
   - a table of epics: identifier, title, goal, the requirements it covers, and the epics it depends on;
   - for each epic: scope, out of scope and exit criteria;
   - a coverage table showing every MUST requirement in exactly one epic;
   - **on a revision:** a "What changed" list at the top, naming each epic added, changed, renumbered or dropped.
5. Call ExitPlanMode. If the user rejects or comments, revise and call it again. Repeat until the user approves.

## Step 3: After approval

1. Write `docs/epics/README.md` from `docs/_templates/epics-index.md`, with `frozen: true`.
2. **Epic folders:**
   - **New epic:** create `docs/epics/E<nn>-<slug>/epic.md` from `docs/_templates/epic.md`, with `status: planned` and an empty `branch:`.
   - **Existing epic:** update its `epic.md` in place. Keep its identifier and folder name.
   - **Dropped epic:** delete its folder only if its status is `planned` and it contains nothing but `epic.md`. Otherwise STOP and ask the user what to do.
   - **Renumbering** (changing identifiers or folder names) is allowed only while every epic has status `planned`.
3. Delete `docs/epics/.gitkeep` if it exists.
4. Run `node .claude/tools/docs-check.mjs`, and fix any problem it reports.
5. STOP with:

   > List of epics approved and frozen. Commit it on master when you're ready, for example `git add docs && git commit -m "docs: epics"`. Next: `/brief`
