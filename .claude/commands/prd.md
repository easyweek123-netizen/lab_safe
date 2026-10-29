---
description: Plan mode. The product-manager researches similar products and drafts the requirements document from the course brief and the impact you want. On approval it writes docs/prd/PRD.md.
argument-hint: '"<the impact we want>"  or, for a revision, "<your feedback>"'
---

Arguments: `$ARGUMENTS`

## Step 1: Check

If `docs/epics/README.md` exists and has `frozen: true`, STOP: "The list of epics is frozen. Requirement changes now go through `/change-request`."

## Step 2: Draft in plan mode

1. If you are not in plan mode, enter it with EnterPlanMode.
2. Read `.claude/agents/product-manager.md`, and act as that role in Mode 1 (research, then write the requirements document).
3. Inputs:
   - `LabSafe_Required_Features.pdf`;
   - the existing `docs/prd/PRD.md`, if there is one (then this is a revision);
   - the arguments above: the impact the user wants, or their feedback.
4. Write the **complete** requirements document as the plan, following `docs/_templates/prd.md`. On a revision, start with a short list titled "What changed since the last draft".
5. Call ExitPlanMode. If the user rejects the plan or comments on it, treat that as feedback, revise, and call ExitPlanMode again. Repeat until the user approves.

## Step 3: After approval

1. Write `docs/prd/PRD.md` with `status: approved` and `updated:` set to today's date.
2. Run `node .claude/tools/docs-check.mjs`, and fix any problem it reports.
3. STOP with: "Requirements document approved and written. Commit it when you're ready, for example `git add docs/prd && git commit -m "docs: requirements document"`. Next: `/design-doc`"
