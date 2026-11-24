---
description: Builds a designed epic story by story, backend tickets first, then frontend tickets. The architect reviews each story, the qa-engineer tests it, and the developers fix what they find. Ends with a build report. With feedback as an argument, it gets your code-review feedback fixed. Never commits.
argument-hint: 'E02   or   E02 "<your feedback>"'
---

Arguments: `$ARGUMENTS`. The first word is the epic identifier; the rest is optional feedback from your code review.

## Rules

- One agent at a time. Never run `pnpm verify` and `pnpm e2e` at the same time.
- Blocker and major findings and bugs are fixed, at most 2 rounds per check. If one is still open, STOP (Step 6). Minor ones become known gaps.
- STOP when a developer reports a contract that looks wrong, an unclear requirement, a test it believes is wrong, or a command it may not run, or when the architect says the design must change.
- Statuses are the progress. Running the command again continues from the first story that is not `done`.
- Pass agents file paths and identifiers, and the user's feedback word for word.

## Step 1: Check

1. The current branch is the epic's branch, and `node .claude/tools/docs-check.mjs` reports no problems.
2. First run (the epic is `planned`): set `design.md` to `status: approved`, and the epic to `in-progress` in `epic.md` and `docs/epics/README.md`.

If the arguments contain feedback, go to Step 5.

## Step 2: Build each story, in order

Skip stories that are `done`.

**a. Tickets.** Set the story to `building`. Take its tickets that are not `done`: backend first, then frontend, each by number once its `depends_on` are `done`. Launch **backend-dev** or **frontend-dev** with the paths of `story.md` and the ticket. Then run `pnpm verify`; if it fails, send the output back to the same agent.

**Migration.** If backend-dev reports a migration for review:
1. Show the user its path, the tables and columns it changes, and what its `down` step does.
2. Ask with AskUserQuestion: "Review `<path>`. Run it on the development database?", with the options "Approve and run" and "Change it".
3. On approval, run `pnpm db:migrate`. If the user wants a change, send their words to backend-dev and ask again.

**b. Code review.** Set the story to `in-review`. Run `pnpm verify`, then launch **architect** in Mode 2 with the path of `story.md` and the result. If the verdict is CHANGES:
1. Give each open blocker and major finding to its agent (`[be]` backend-dev, `[fe]` frontend-dev, `[docs]` architect).
2. Mark each finding `→ fixed: …` or `→ disputed: …`.
3. Run `pnpm verify`, then launch the architect again.

**c. Browser test.** Set the story to `qa`. Launch **qa-engineer** with the path of `story.md`. If the verdict is FAIL, fix the blocker and major bugs as in b, then launch the qa-engineer again.

**d. Done.** Copy unfixed minor findings and bugs into the story's "Known gaps". Set the story to `done` and update its row in `epic.md`. Tell the user in one line, and continue.

## Step 3: Final checks

Run `pnpm verify`, `pnpm e2e` and `node .claude/tools/docs-check.mjs`. Give any failure to the agent for its layer.

## Step 4: Report and stop

Write the `## Build report` section of `epic.md` and show it:

1. Each story: tickets, review rounds, QA result, known gaps.
2. Each epic acceptance criterion `C<n>`: delivered or not, and by which story.
3. Every finding and bug: fixed, disputed (and why), or a known gap.
4. Migrations, and whether each ran on the development database.
5. Every difference from the design that the developers recorded.
6. Where to look first: the files the architect's reviews point to.
7. The results of Step 3.
8. How to try it: 3–8 steps per role on `pnpm qa:serve` (`http://localhost:4100`).

End with:

> Review the code. Feedback: `/build-epic <epic> "<feedback>"`. When you are satisfied: `/complete-epic <epic>`

## Step 5: Your feedback

1. If any story is not `done`, STOP. List those stories and tell the user to finish the build with `/build-epic <epic>`. Do not build anything.
2. Launch **architect** in Mode 3 with the feedback.
3. Fix the findings as in Step 2b, then launch the architect in Mode 3 again to check them.
4. If a fix changed a page, run the qa-engineer for that story.
5. Continue with Steps 3 and 4. The report adds each feedback item and what was done.

## Step 6: When the run stops early

Show where it stopped (story, ticket or step), what failed, and what the user needs to do. End with: "Then run `/build-epic <epic>` again; it continues from here."
