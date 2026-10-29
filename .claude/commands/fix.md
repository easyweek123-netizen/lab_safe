---
description: Fixes the review findings and browser-test bugs that you ticked, for a story or an epic. Runs one agent at a time.
argument-hint: 'S02.1 ["<extra instructions>"]   or   E02 ["<extra instructions>"]'
---

Arguments: `$ARGUMENTS`. The first word is the target (a story or epic identifier); the rest is optional extra instructions.

## Step 1: Collect what to fix

1. From the latest round in the target's review file (`review.md` for a story, `epic-review.md` for an epic), take every ticked item (`- [x]`) that has no `→ fixed` or `→ disputed` mark yet.
2. Do the same for the latest run in the target's `qa.md`.
3. Keep the `> note` lines written under each item.
4. Add the extra instructions from the arguments.
5. If there is nothing to fix, STOP: "Nothing is ticked. Tick the findings or bugs you want fixed, then run `/fix` again."

## Step 2: Hand out the work, one agent at a time

1. Items tagged `[be]` go to **backend-dev**.
2. When backend-dev has finished, items tagged `[fe]` go to **frontend-dev**.
3. Items tagged `[docs]` go to the agent that owns that document (see `docs/CLAUDE.md`).
4. An extra instruction that isn't about a specific item goes to the agent for the layer it concerns. If it's unclear which layer, ask the user before continuing.

Give each agent the item identifiers, the item text and notes, the file paths, and the path of `story.md`.

## Step 3: Mark the items

Using what each agent reports, add to the end of each item's line either `→ fixed: <one line saying what changed>` or `→ disputed: <one line saying why>`.

## Step 4: Check

Run `pnpm verify`. If any browser-test bug was fixed, also run `pnpm e2e`.

## Step 5: Report and stop

List what was fixed and what was disputed, and the check results. End with:

- "Next: `/review <target>`", if any review finding was fixed; or
- "Next: `/qa <target>`", if only browser-test bugs were fixed.
