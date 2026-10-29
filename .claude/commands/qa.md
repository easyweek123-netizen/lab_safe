---
description: Browser testing. Runs a story's test cases, or an epic's user journeys, with the Playwright browser tools; turns automated end-to-end test cases into tests; writes qa.md.
argument-hint: 'S02.1   or   E02'
---

Target: `$ARGUMENTS`, either a story identifier or an epic identifier.

## Step 1: Check

- **Story:**
  - Its status must be `in-review` or `qa`.
  - The latest round in its `review.md` must have verdict APPROVE. If it doesn't, STOP, unless every open blocker and major finding was left unticked by the user (meaning they accepted it).
- **Epic:**
  - Its status must be `epic-review`.
  - The latest round in `epic-review.md` must have verdict APPROVE.

## Step 2: Test

1. For a story, set its status to `qa`.
2. Launch **qa-engineer** with:
   - the mode (story or epic);
   - the paths of the story or epic documents;
   - the path of `qa.md`.

## Step 3: Report and stop

Show:

- the verdict;
- how many test cases passed and how many failed;
- the bugs found;
- the Playwright tests added;
- the `pnpm e2e` result;
- the screenshot folder.

End with:

- if the verdict is PASS: "Next: `/story-done <story>`" (or "`/epic-done <epic>`" for an epic);
- if the verdict is FAIL: "Open `qa.md` and tick the bugs you want fixed. Then `/fix $ARGUMENTS`, then `/qa $ARGUMENTS` again."
