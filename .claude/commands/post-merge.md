---
description: After you merge an epic, confirms it is on master and that master still works.
argument-hint: 'E02'
---

Epic: `$ARGUMENTS`

## Step 1: Confirm the merge

1. If a remote exists, run `git fetch`.
2. Run `git switch master`. If a remote exists, also run `git pull --ff-only`.
3. Run `git merge-base --is-ancestor epic/<epic identifier>-<slug> master`. If the epic branch is not part of master, STOP: "The epic isn't merged yet. Merge it first."

## Step 2: Check master

1. Run `pnpm install`.
2. **Ask the user for approval** before each database command: starting the databases (`pnpm db:up`), and applying migrations to the development database if the project-wide technical design defines them. Run them only after a clear yes.
3. Run `pnpm verify`.
4. Run `pnpm e2e`.

If anything fails, STOP. Fixing master is now the top priority: explain the failure and propose a fix branch. Never fix anything directly on master.

## Step 3: Review and smoke test (one after another)

1. Launch **fullstack-reviewer** in after-merge mode.
2. Then launch **qa-engineer** in after-merge mode.

Both report in their answers only.

## Step 4: Clean up

1. Run `git branch -d epic/<epic identifier>-<slug>`.
2. Launch **lead** in brief mode to refresh `docs/BRIEF.md`.

## Step 5: Report and stop

Show:

- whether master is stable;
- the smoke test results;
- the "Today" section of the brief.

End with: "Click through master yourself (`pnpm dev`)."
