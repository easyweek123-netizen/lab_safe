---
description: Final check of a built epic on its branch, before you push. The architect records every deviation from the design; the product-manager accepts the epic against the requirements document. Never commits, pushes or merges.
argument-hint: 'E02'
---

Epic: `$ARGUMENTS`

## Step 1: Check

If a check fails, STOP and report it. Do not fix anything.

1. The current branch is the epic's branch, and every story is `done`.
2. If `epic-review.md` exists, its latest round says APPROVE.
3. `pnpm verify`, `pnpm e2e` and `node .claude/tools/docs-check.mjs` pass. If one fails, show the failure and tell the user they can send it as feedback with `/build-epic <epic> "<feedback>"`.

## Step 2: Architect

Launch **architect** in Mode 4. It updates the documents for every deviation and writes the epic's verification.

## Step 3: Product-manager

Launch **product-manager** in Mode 2. It accepts the epic against the requirements document and rewrites `docs/BRIEF.md`.

## Step 4: Close and report

1. If both said GREEN, set the epic to `done` in `epic.md` and `docs/epics/README.md`, and run `node .claude/tools/docs-check.mjs`.
2. Show both verdicts, the deviations recorded, any gaps, and `MUST requirements accepted: x / y`.
3. Show the commands for the user:

   ```
   git add -A && git commit -m "feat(<epic identifier>): <epic title>" && git push
   git switch master && git merge --no-ff epic/<epic identifier>-<slug> && git push
   ```

End with "Next: `/design-epic <next epic>`", naming the epic the brief recommends. If a verdict is RED, end instead with the gaps.
