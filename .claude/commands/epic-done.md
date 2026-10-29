---
description: Final check of an epic. Runs the automatic checks, the architect's verification, the product-manager's acceptance against the requirements document, and brings the designs up to date. Never commits or merges.
argument-hint: 'E02'
---

Epic: `$ARGUMENTS`

## Step 1: Check the preconditions

If any fails, STOP and say what is missing.

1. Every story of the epic has status `done`.
2. The latest round in `epic-review.md` has verdict APPROVE.
3. The latest run in the epic's `qa.md` has verdict PASS.

## Step 2: Run the automatic checks

Run, in this order:

1. `pnpm verify`
2. `pnpm e2e`
3. `node .claude/tools/docs-check.mjs`

If any of them fails, STOP and report the failure.

## Step 3: Architect

1. Launch **architect** in Mode 4 (verification) for the epic. It writes GREEN or RED under `## Verification` in `epic.md`.
2. If the result is GREEN, launch **architect** again in Mode 5, to bring `design.md` and `docs/technical-design/design-doc.md` up to date with the code.

## Step 4: Product-manager

Launch **product-manager** in Mode 3 (accept a finished epic). It adds the epic's entry to the acceptance log of the requirements document, and ticks the exit criteria it can confirm in `epic.md`.

## Step 5: Close the epic

If the architect and the product-manager both said GREEN, set the epic's status to `done` in `epic.md` and in `docs/epics/README.md`.

## Step 6: Report and stop

- **Both GREEN:**
  1. Show `git log --oneline master..HEAD`, `git diff --stat master...HEAD`, and both verdicts.
  2. Then show the user these commands to run themselves:

     ```
     git add -A && git commit -m "docs(<epic identifier>): close epic" && git push
     git switch master && git merge --no-ff epic/<epic identifier>-<slug> && git push
     ```

  3. End with: "Review the epic in git, then merge. After merging: `/post-merge <epic identifier>`"
- **Otherwise:** show the gaps and the next command: `/fix <epic identifier> "<gaps>"` or `/change-request "<change>"`.
