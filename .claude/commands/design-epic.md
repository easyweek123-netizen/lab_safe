---
description: Designs one epic. The product-manager writes what the epic delivers and its acceptance criteria. The architect writes the epic's technical design, its stories and its tickets. Run it again with your feedback to revise.
argument-hint: 'E02 ["<your feedback>"]'
---

Arguments: `$ARGUMENTS`. The first word is the epic identifier; the rest is optional feedback.

## Step 1: Check

If a check fails, STOP and say which one.

1. The epic's status in `epic.md` is `planned`, and every epic in its `depends_on` is `done`.
2. The current branch is `epic/<epic identifier>-<slug>`, with the slug from the epic's folder name. If not, STOP: "Create the epic branch first: `git switch -c epic/<epic identifier>-<slug>`". Never create or switch branches yourself.
3. If `design.md` already exists (a revision), every story is still `draft`. If not, STOP: "Building has started. Give feedback with `/build-epic <epic> "<feedback>"`."

Set `branch:` in `epic.md` to the current branch.

## Step 2: Requirements

Launch **product-manager** in Mode 1 with the path of `epic.md`. On a revision, do this only if the feedback is about what the epic delivers or its acceptance criteria, and pass the feedback word for word.

## Step 3: Technical design

Launch **architect** in Mode 1 with the path of `epic.md`. On a revision, pass the feedback word for word.

## Step 4: Check the result

1. Every requirement in the epic's `covers` is in some story's `covers`.
2. Every epic acceptance criterion (`C1` …) is delivered by at least one story.
3. Every story acceptance criterion (`AC1` …) is covered by at least one ticket.
4. `node .claude/tools/docs-check.mjs` reports no problems.

If something is missing, stop and report problem.

## Step 5: Report and stop

Show one row per story (identifier, title, epic criteria it delivers, acceptance criteria, tickets in build order), then the open questions, requirement changes and decisions.

End with:

> Review `epic.md`, `design.md`, the stories and the tickets. Edit them, or run `/design-epic <epic> "<feedback>"`. When you are satisfied: `/build-epic <epic>`
