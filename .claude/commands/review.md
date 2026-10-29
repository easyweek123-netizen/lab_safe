---
description: One full-stack review round of a story's uncommitted changes, or of all changes on an epic branch. Findings are written unticked for you to choose from.
argument-hint: 'S02.1   or   E02'
---

Target: `$ARGUMENTS`, either a story identifier or an epic identifier.

## Step 1: Choose the mode and check

- **A story identifier (for example `S02.1`):** story mode, and the review file is `<story folder>/review.md`.
  - Every ticket of the story must have status `done`. If not, STOP and list the tickets that aren't done.
  - Set the story's status to `in-review`.
- **An epic identifier (for example `E02`):** epic mode, and the review file is `<epic folder>/epic-review.md`.
  - Every story of the epic must have status `done`. If not, STOP and list the stories that aren't done.
  - Set the epic's status to `epic-review`, in `epic.md` and in `docs/epics/README.md`.
- In both modes, the current branch must be the epic's branch.

## Step 2: Review

Launch **fullstack-reviewer** with:

- the mode;
- the paths of the story or epic documents;
- the path of the review file.

## Step 3: Report and stop

Show:

- the verdict;
- the number of findings by severity;
- each blocker and major finding on one line;
- any finding that was reopened.

End with:

- if the verdict is CHANGES: "Open `<review file>` and tick (`[x]`) the findings you want fixed. Add instructions as `> note` lines under a finding if you like. Next: `/fix $ARGUMENTS`";
- if the verdict is APPROVE: "Next: `/qa $ARGUMENTS`".
