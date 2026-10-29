---
description: Runs the automatic checks (pnpm verify, pnpm e2e, documentation check) and summarises the results.
---

1. Run `pnpm verify`.
2. Run `pnpm e2e`.
3. Run `node .claude/tools/docs-check.mjs`.

If one of these commands doesn't exist yet, say so and continue with the next.

Summarise:

- pass or fail for each command;
- the number of tests;
- the first failure, with its `file:line`.

Don't fix anything unless the user asks.
