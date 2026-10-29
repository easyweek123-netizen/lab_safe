---
description: Plan mode. The architect drafts a short technical design for one epic, with diagrams and decisions. On approval it creates the epic branch and writes design.md.
argument-hint: 'E02 ["<your feedback>"]'
---

Arguments: `$ARGUMENTS`. The first word is the epic identifier; the rest is optional feedback.

## Step 1: Check

If any check fails, STOP and say which one and why.

1. `docs/epics/README.md` has `frozen: true`.
2. The epic's status is `planned` (a first design) or `planning` (a revision; you must then be on the epic's branch).
3. Every epic in its `depends_on` has status `done` on `master`.
4. **For a first design only:** the current branch is `master`, and `git status --porcelain` shows no changes.

## Step 2: Draft in plan mode

1. If you are not in plan mode, enter it with EnterPlanMode.
2. Read `.claude/agents/architect.md`, and act as that role in Mode 3 (epic technical design).
3. Inputs:
   - the requirements document and the project-wide technical design;
   - the epic's `epic.md`;
   - the code;
   - the current `design.md`, if this is a revision;
   - the user's feedback.
4. Write the design as the plan, following `docs/_templates/design.md`. Keep it to about 150 lines plus Mermaid diagrams. Use an entity–relationship diagram for data changes and a sequence diagram for each non-trivial flow. Include the "Decisions" section.
5. Call ExitPlanMode. Revise after any feedback until the user approves.

## Step 3: After approval

1. **For a first design only:**
   - run `git switch -c epic/<epic identifier>-<slug>`, taking the slug from the epic's folder name;
   - in `epic.md`, set `status: planning` and `branch: epic/<epic identifier>-<slug>`;
   - set the epic's status to `planning` in `docs/epics/README.md` as well.
2. Write `docs/epics/<epic folder>/design.md` with `status: approved` and `updated:` set to today's date.
3. Run `node .claude/tools/docs-check.mjs`.
4. STOP with: "Epic design approved on branch `epic/<…>`. Next: `/epic-stories <epic identifier>`"
