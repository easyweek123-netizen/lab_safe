---
description: Plan mode. The architect drafts the project-wide technical design (with Mermaid diagrams and project-wide decisions) from the requirements document. On approval it writes docs/technical-design/design-doc.md.
argument-hint: '["<your feedback>"]'
---

Arguments: `$ARGUMENTS`

## Step 1: Check

`docs/prd/PRD.md` must exist with `status: approved`. If it doesn't, STOP with: "Next: `/prd`".

## Step 2: Draft in plan mode

1. If you are not in plan mode, enter it with EnterPlanMode.
2. Read `.claude/agents/architect.md`, and act as that role in Mode 1 (project-wide technical design).
3. Inputs:
   - the requirements document;
   - root `CLAUDE.md` (the tooling commands the project must provide, and the notes about this computer);
   - any existing code;
   - the existing `docs/technical-design/design-doc.md`, if there is one;
   - the user's feedback from the arguments.
4. Write the complete design as the plan, following `docs/_templates/design-doc.md`, with Mermaid diagrams and a filled-in "Decisions" section.
5. Call ExitPlanMode. Revise after any feedback until the user approves.

## Step 3: After approval

1. Write `docs/technical-design/design-doc.md` with `status: approved` and `updated:` set to today's date.
2. Run `node .claude/tools/docs-check.mjs`.
3. STOP with: "Project-wide technical design approved. Commit it when you're ready. Next: `/epics "<how you want the work split, for example: first epic sets up the project code>"`"
