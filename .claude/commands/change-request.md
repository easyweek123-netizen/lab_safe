---
description: Writes a change request (a change to the requirements after the list of epics is frozen) into the epic it affects, with its impact; or, after you approve it, applies it everywhere.
argument-hint: '"<the change>"   or   E03/CR-01 apply'
---

Arguments: `$ARGUMENTS`

If the arguments end with `apply`, follow **Apply**. Otherwise follow **Propose**.

## Propose: the arguments are the change in your own words

1. Launch **product-manager** in Mode 2 (propose a change request), passing the change word for word. It chooses the affected epic and writes `docs/epics/<epic folder>/CR-<nn>-<slug>.md` with `status: proposed`.
2. STOP and show:
   - the requirement wording before and after;
   - the impact table;
   - whether the epic must be reopened;
   - the proposed stories;
   - the recommendation.
3. End with: "To approve, run `/change-request <epic identifier>/CR-<nn> apply` (edit the file first if you like). To reject it, set its `status: rejected`."

## Apply: the arguments are `<epic identifier>/CR-<nn> apply`

Check that the change request exists and has `status: proposed`. Then run these steps one after another:

1. **product-manager**, Mode 2 (apply): updates the requirements document and `epic.md`, and sets the change request to `applied`.
2. **architect**, Mode 5: if the epic's `design.md` or the project-wide technical design is affected, updates it and adds a "Changes" line naming the change request. No plan mode for this.
3. **story-planner**: writes new stories with `type: change` in the epic. If an affected story is still `draft`, it edits that story instead.
4. **If the epic's status was `done`:**
   - set it back to `in-progress` in `epic.md` and in `docs/epics/README.md`;
   - tell the user to run `git switch -c epic/<epic identifier>-<slug> master` once their working tree is clean.
5. Run `node .claude/tools/docs-check.mjs`.
6. STOP. List the changed documents, then end with "Next: `/build <new story> <its first ticket>`" or "Next: `/brief`".
