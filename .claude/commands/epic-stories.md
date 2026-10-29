---
description: Breaks the approved epic design into stories (with acceptance criteria and test cases) and backend and frontend tickets. Run it again with feedback to revise.
argument-hint: 'E02 ["<your feedback>"]'
---

Arguments: `$ARGUMENTS`. The first word is the epic identifier; the rest is optional feedback.

## Step 1: Check

If any check fails, STOP and say which one and why.

1. The current branch is the epic's branch (`branch:` in `epic.md`).
2. The epic's `design.md` has `status: approved`.
3. No story of the epic has a status other than `draft`. Once building starts, stories are frozen; changes then go through `/change-request`.

## Step 2: Plan the stories

Launch **story-planner** with:

- the path of `epic.md`;
- the path of `design.md`;
- the path of `docs/prd/PRD.md`;
- the path of `docs/technical-design/design-doc.md`;
- the user's feedback, word for word.

## Step 3: Check the result yourself

1. Every requirement in the epic's `covers` appears in some story's `covers`.
2. Every acceptance criterion has at least one test case.
3. Every automated test case names exactly one existing ticket.
4. `node .claude/tools/docs-check.mjs` reports no problems.

If something is missing, send it back to story-planner. Do this at most twice; then report what is still missing.

## Step 4: Report and stop

Show a table with one row per story: the identifier, the title, the number of acceptance criteria, the number of test cases (automated and manual), and its tickets in build order.

End with: "Review the story files. Edit them directly, or run `/epic-stories <epic identifier> "<feedback>"`. Next: `/build <first story> <first ticket>`"
