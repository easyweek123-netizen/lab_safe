---
description: End of day. Brings every document in line with the code, then refreshes docs/BRIEF.md with tomorrow's plan.
---

Run these steps one after another, never in parallel.

1. Launch **lead** in end-of-day mode. It updates status fields and reports three lists:
   - epics whose code changed today;
   - work that looks like a change of scope;
   - tickets whose text no longer matches what was built.
2. For each epic whose code changed, launch **architect** in Mode 5 (update the designs to match the code). If the architect reports a defect (the code is wrong, not the design), list it for the user and don't fix it now.
3. If there is work that looks like a change of scope, launch **product-manager** in Mode 4. It writes change requests; it does not edit the requirements document.
4. If there are tickets whose text is outdated, launch **story-planner** to update their text so it matches what was built.
5. Run `node .claude/tools/docs-check.mjs`. If it reports problems, give each one to the agent that owns the file (see `docs/CLAUDE.md`), until the check passes.
6. Launch **lead** again to rewrite `docs/BRIEF.md`, including a "Tomorrow" section.
7. STOP and show:
   - the changed documents (`git status --short docs/`). They aren't committed yet; they go into your next commit;
   - any defects the architect reported;
   - the "Tomorrow" section of the brief;
   - `Next: <command>`.
