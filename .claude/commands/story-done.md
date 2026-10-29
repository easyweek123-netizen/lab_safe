---
description: Final check of a story. Runs the automatic checks, then the architect verifies the work against the story and designs (GREEN or RED). Never commits.
argument-hint: 'S02.1'
---

Story: `$ARGUMENTS`

## Step 1: Check the preconditions

If either fails, STOP and list what is still open.

1. The latest run in the story's `qa.md` has verdict PASS.
2. Every ticked finding in `review.md` and every ticked bug in `qa.md` is marked `→ fixed` or `→ disputed`.

## Step 2: Run the automatic checks

Run, in this order:

1. `pnpm verify`
2. `pnpm e2e`
3. `node .claude/tools/docs-check.mjs`

If any of them fails, STOP and report the failure. Don't fix anything in this command.

## Step 3: Architect verification

Launch **architect** in Mode 4 (verification), for this story. It writes the `## Verification` section in `story.md`.

## Step 4: If the verdict is GREEN

1. Set every ticket of the story, and the story itself, to `status: done`.
2. Update the story's row in the story table of `epic.md`.
3. Copy every unticked finding and bug into the "Known gaps" section of `story.md`.

## Step 5: Report and stop

- **GREEN:**
  1. Give the user a short checklist to try in the browser themselves: 3 to 6 steps covering each role, with the addresses from `pnpm dev`.
  2. Then say: "Commit and push when you're satisfied. Next: `/build <next story> <its first ticket>`". If this was the last story of the epic, say "Next: `/review <epic>`" instead.
- **RED:** list the gaps the architect found, then say: "Next: `/fix $ARGUMENTS "<short summary of the gaps>"`".
