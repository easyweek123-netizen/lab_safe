# LabSafe

Every instrument in our chemistry lab gets an admin-approved safety page; anyone can search, read and ask an AI assistant about them. Course project (Current Topics in Technologies, JKU Linz).

## Where things are

| What | Where |
| --- | --- |
| The course brief (never edit) | `LabSafe_Required_Features.pdf` |
| Requirements, impact metrics, acceptance log | `docs/prd/PRD.md` |
| Project-wide technical design and decisions | `docs/technical-design/design-doc.md` |
| Epics, with their design, stories, tickets, reviews and browser tests | `docs/epics/` (list: `docs/epics/README.md`) |
| What to work on next | `docs/BRIEF.md` |
| Status of everything | `node .claude/tools/board.mjs` |
| Documentation rules | `docs/CLAUDE.md` |
| Coding rules | `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md` |

Build nothing that the requirements document does not require.

## Words we use

- **Epic:** a large feature area, in `docs/epics/E<nn>-<slug>/`. Its plain-English acceptance criteria are `C1`, `C2` …
- **Story:** a slice of an epic a user can try, in `S<nn>.<n>-<slug>/`. Its acceptance criteria are `AC1`, `AC2` … ("Given … When … Then …"). Each has a test titled with the story and criterion, for example `S02.1 AC2`.
- **Ticket:** one piece of work in one layer: backend (`BE-<nn>`) or frontend (`FE-<nn>`).
- **Finding** (`F<n>`): a problem from the architect's review. **Bug** (`B<n>`): a problem from the browser test. Each is blocker, major or minor. A **known gap** is a minor one left unfixed.
- **Decision:** a choice that is expensive to undo, in the "Decisions" section of a design.

## Stack

React · NestJS · PostgreSQL · TypeScript. Everything else is decided in the project-wide technical design.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm verify` | Format check, lint, type check, unit and integration tests, build, documentation check |
| `pnpm e2e` | Browser tests against a separate copy of the app on a fresh test database |
| `pnpm qa:serve` | Start that copy and keep it running |
| `pnpm dev` | Run the app for development |
| `pnpm db:up` | Start the development and test databases |

## How we work

```
git switch -c epic/E02-<slug>   (you)
/design-epic E02 ★    → /design-epic E02 "<feedback>" ★ …
/build-epic E02 ★     → /build-epic E02 "<feedback>" ★ …
/complete-epic E02 ★  → you commit, push and merge
```

★ means the user decides. Run `/build-epic` in auto mode; database prompts still appear.

Rules for the main session running a command:

- One subagent at a time. No git worktrees. No background work except `pnpm qa:serve`.
- Pass file paths and identifiers, and the user's feedback word for word.
- Blocker and major findings and bugs are fixed automatically, at most 2 rounds, then the command stops and reports.
- End every command with `Next: <the exact next command>`.

## Definition of done

- **Ticket:** a passing test for each acceptance criterion it covers; "Files changed" filled in; status `done`.
- **Story:** the architect's review is APPROVE with verification GREEN; the browser test is PASS; `pnpm verify` and `pnpm e2e` pass.
- **Epic:** every story done; every feedback finding fixed; the architect and the product-manager both GREEN.

## Hard rules

- **Agents never commit, push, merge, rebase, tag, switch branches or run `git reset --hard`.** The user does.
- **No database command without the user's approval:** starting or stopping containers, generating or running migrations, seeding, SQL. A migration is shown to the user before it runs. The exceptions are `pnpm verify`, `pnpm e2e` and `pnpm qa:serve`, which only use the test database `labsafe_test` on port 5443.
- **Requirements change only with the user's approval;** the product-manager records the change.
- **Write every difference from the plan** in the ticket's "Implementation notes".
- Never edit `LabSafe_Required_Features.pdf`, `.claude/settings.json`, `.claude/hooks/` or `.claude/tools/`. Never read `.env`.
- No new major dependency versions inside an epic.
- If something is unclear: write it in "Open questions", pick the simplest safe option, and say which.

## Notes about this computer

- Port 5432 is taken: the development database is on **5442**, the test database on **5443**.
- Docker Hub may be unreachable; `postgres:15` is already downloaded.
- Node 24, pnpm 11 (native builds are approved with `allowBuilds:` in `pnpm-workspace.yaml`).
- Install Playwright's browser once: `pnpm exec playwright install chromium`.
- The shell is zsh, which has no `PIPESTATUS`: check exit codes without pipes.
