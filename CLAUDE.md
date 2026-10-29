# LabSafe

Every instrument in our chemistry lab gets an admin-approved safety page; anyone can search, read and ask an AI assistant about them. Course project (Current Topics in Technologies, JKU Linz).

## Where things are

| What                                                                                             | Where                                                                    |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| The course brief (input only, never edit)                                                        | `LabSafe_Required_Features.pdf` (repository root)                        |
| The requirements document: every requirement, its priority, the impact metrics, the acceptance log | `docs/prd/PRD.md`                                                      |
| The project-wide technical design, including project-wide decisions                              | `docs/technical-design/design-doc.md`                                    |
| Epics, each with its own technical design, decisions, stories, tickets, reviews and browser test runs | `docs/epics/` (the list of epics: `docs/epics/README.md`)           |
| What to work on today                                                                            | `docs/BRIEF.md` (refresh it with `/brief`)                               |
| Current status of every epic, story and ticket                                                   | run `node .claude/tools/board.mjs`                                       |
| Documentation rules: identifiers, frontmatter, statuses, who owns which file                     | `docs/CLAUDE.md`                                                         |
| Coding rules per application                                                                     | `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md` (written by the epic that sets up the code) |

Build nothing that the requirements document does not require.

## Words we use

- **Epic:** a large feature area, for example "Accounts and access". Lives in `docs/epics/E<nn>-<slug>/`.
- **Story:** one slice of an epic that a user can see and try, for example "Sign up and log in". Contains acceptance criteria, test cases and tickets.
- **Ticket:** one piece of work in one layer: a backend ticket (`BE-<nn>`, NestJS and database) or a frontend ticket (`FE-<nn>`, React).
- **Acceptance criterion:** one numbered condition a story must meet, written as "Given … When … Then …". Identifier `AC<n>`.
- **Test case:** one concrete check of an acceptance criterion: role, preconditions, steps, expected result, and whether it is automated or checked by hand. Identifier `TC-<criterion number>.<n>`.
- **Finding:** a problem found by the reviewer (`F<n>`). **Bug:** a problem found in browser testing (`B<n>`).
- **Change request:** a change to the requirements after the epic list is frozen. Identifier `CR-<nn>`, stored in the epic it affects.
- **Decision:** a technical choice that is expensive to undo later (for example "sessions are stored in an httpOnly cookie"). Recorded in the "Decisions" section of the design document it belongs to.

## Stack

React (web) · NestJS (backend) · PostgreSQL (database) · TypeScript everywhere. Every other choice is made in the project-wide technical design.

## Tooling commands the project must provide

The epic that sets up the project code must create these commands at the repository root. The agents' slash commands rely on them. Until a command exists, any slash command that needs it says "not available yet" and skips that step.

| Command           | What it must do                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm verify`     | The automatic quality gate: formatting check, lint, type check, unit tests, backend integration tests, build, documentation check |
| `pnpm e2e`        | End-to-end browser tests against a separate copy of the application that uses a fresh test database        |
| `pnpm qa:serve`   | Start that same separate copy and keep it running for browser testing; print its address                   |
| `pnpm dev`        | Run the application locally for development                                                                 |
| `pnpm db:up`      | Start the development database and the test database                                                      |
| `pnpm typecheck`  | Type check every package (the Stop hook runs it)                                                            |
| `pnpm docs:check` | Run `node .claude/tools/docs-check.mjs`                                                                     |

<!-- The epic that sets up the code replaces this comment with the full command table (ports, migrations, seeding, test accounts). -->

## How we work

★ marks a step where the user decides. Run one command at a time; never run two in parallel.

```
project start:  /prd "<impact we want>" ★ → /design-doc ★ → /epics "<how to split the work>" ★     (each one in plan mode; the user approves the plan)
every day:      /brief  …  /eod
each epic:      /epic-design E02 ★ (plan mode; creates the branch epic/E02-…) → /epic-stories E02 ★
each story:     /build S02.1 BE-01 → /build S02.1 BE-02 → /build S02.1 FE-01 …   (one named ticket per run)
                → [/review S02.1 → ★ user ticks findings → /fix S02.1]  repeated until the user is satisfied
                → /qa S02.1 → /story-done S02.1 → ★ user tests, commits and pushes
end of epic:    [/review E02 → ★ user ticks findings → /fix E02] repeated → /qa E02 → /epic-done E02
                → ★ user reviews, merges into master → /post-merge E02
a change:       /change-request "<the change>" → ★ /change-request E03/CR-01 apply
```

Rules for the main session when it runs a slash command (the "orchestrator"):

- **One thing at a time.** Launch at most one subagent at a time. No git worktrees. No background work, except the application server that the qa-engineer starts for browser testing.
- Give subagents file paths and identifiers, never pasted copies of documents. Pass the user's feedback word for word.
- **Plan-mode commands** (`/prd`, `/design-doc`, `/epics`, `/epic-design`): enter plan mode, read the agent file named in the command and act as that role, write the document as the plan, then call ExitPlanMode. If the user rejects the plan or comments on it, treat that as feedback: revise and present the plan again. Write files only after the user approves.
- Reviewer findings and browser-test bugs are written **unticked**. Only items the user ticks (`[x]`) are fixed.
- Stop at every ★. End every slash command with `Next: <the exact next command>`.

## Definition of done

- **Ticket:** every step is done; every test case the ticket owns is automated and passing; the ticket's "Implementation notes" are filled in; its status is `done`.
- **Story:**
  - Every acceptance criterion has at least one test case, and every automated test case has a passing test named after it.
  - For every role that must be refused, a test proves it is refused.
  - The latest review verdict is APPROVE, or the user decided to leave the remaining findings.
  - The latest browser test run is PASS.
  - `pnpm verify` and `pnpm e2e` pass.
  - The architect's verification is GREEN.
  - The documentation matches the code.
- **Epic:**
  - Every story is done and the latest epic review verdict is APPROVE.
  - The latest epic browser test run is PASS.
  - The architect's verification is GREEN.
  - The product-manager's acceptance against the requirements document is GREEN.
  - The epic's technical design and the project-wide technical design match what was built.

## Hard rules

- **Agents never commit, push, merge, rebase, tag or run `git reset --hard`.** Leave a checked working tree; the user commits.
- **Never run a database command without the user's approval.** This covers starting or stopping database containers, migrations, seeding, and any SQL. Ask, wait for a clear yes, then run it. The only exception: the automated test commands `pnpm verify`, `pnpm e2e` and `pnpm qa:serve`, which create and reset the separate test database `labsafe_test` on port 5443. Never point any command that deletes data at anything other than that test database.
- **Requirements live in the requirements document.** Change scope only through `/change-request`.
- **Documentation changes together with code.** If you build something differently from a ticket or a design, update that document (or report the difference) before you finish.
- Never edit `LabSafe_Required_Features.pdf`, `.claude/settings.json`, `.claude/hooks/` or `.claude/tools/`. Never read or print `.env`.
- Never upgrade a dependency to a new major version inside a story. Propose it as a decision in the project-wide technical design instead.
- If something is unclear: write the question in the "Open questions" section of the document you are working on, choose the simplest safe option, and say which option you chose.

## Notes about this computer (learned in an earlier setup; respect them)

- Port 5432 is already used by another project's PostgreSQL. Use **5442 for the development database** and **5443 for the test database**.
- Docker Hub may be unreachable; the `postgres:15` image is already downloaded.
- Node 24 and pnpm 11. In pnpm 11, packages that need native builds are approved with `allowBuilds:` in `pnpm-workspace.yaml` (`onlyBuiltDependencies` is ignored).
- Playwright browsers must be installed once with `pnpm exec playwright install chromium`.
- The shell is zsh, which has no `PIPESTATUS`: check exit codes without pipes.
