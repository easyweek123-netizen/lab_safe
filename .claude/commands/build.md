---
description: Implement exactly ONE named ticket of a story (backend or frontend). The ticket must always be named; this command never chooses one itself.
argument-hint: 'S02.1 BE-01   (story identifier, then ticket identifier or words from the ticket title)'
---

Arguments: `$ARGUMENTS`

The first word is the story identifier, for example `S02.1`. The rest names the ticket: either its identifier (`BE-01`, `FE-02`) or words from its title.

## Step 1: Find the ticket

1. If the story identifier is missing or doesn't match a story folder, STOP and show this error:

   > **Error: no story given.** Usage: `/build S02.1 BE-01`

2. **If no ticket is named, STOP. Never choose a ticket yourself.** Show this error:

   > **Error: no ticket given.** `/build` needs a ticket. Usage: `/build <story> <ticket>`

   Then list every ticket of the story that is not `done`, in build order (backend first, then by number), as a table with these columns: ticket identifier, title, status (`todo` or `doing`), and depends on (each dependency marked done or not done). Below the table, write: `<n> of <total> tickets are not done yet.`

3. If the ticket words match more than one ticket, STOP, list the matching tickets, and ask the user to name one.

## Step 2: Check the preconditions

If any check fails, STOP and say which one failed and why.

1. The current branch is the epic's branch (`branch:` in `epic.md`).
2. The story's status is `draft` or `building`.
3. Every earlier story of the epic (lower story number) has status `done`.
4. Every ticket in the chosen ticket's `depends_on` has status `done`.
5. No other ticket of the story has status `doing`.
6. The chosen ticket is not already `done`. To redo a finished ticket, the user must set its status back to `todo` first.
7. **Only for the story's first ticket:** `git status --porcelain` shows no changes outside `docs/`, meaning the previous story has been committed.

## Step 3: Update statuses (first ticket of the story only)

Set the story's status to `building`. If the epic's status is not yet `in-progress`, set it to `in-progress` in both `epic.md` and `docs/epics/README.md`. Set `updated:` to today's date in every file you change.

## Step 4: Implement

Launch the owning agent: **backend-dev** for a ticket in `be/`, **frontend-dev** for a ticket in `fe/`. Give it the path of `story.md` and the path of this one ticket file, and nothing else to work on.

## Step 5: Check

1. Run `pnpm verify`. If it doesn't exist yet, run the commands the ticket names as its proof of work.
2. If the check fails, send the error output back to the same agent. Do this at most twice; if it still fails, STOP and report the failure.

## Step 6: Report and stop

Report:

- the ticket identifier and title;
- the files changed;
- the tests added, listed by test case;
- the check result;
- any differences from the ticket or the design.

End with one of these:

- `Next: /build <story> <next ticket identifier>`, naming the next ticket that is not done, in build order, whose dependencies are all done; or
- `All tickets of <story> are done. Next: /review <story>`.
