---
id: E02
title: Accounts and access
status: done
covers: [US6, US10, US14, NFR4, NFR5]
depends_on: [E01]
branch: epic/E02-accounts-access
updated: 2026-11-24
---

# E02 Accounts and access

## Goal

Lab members can sign up, but they reach the contributor area only after an admin approves them. Admins can share the admin role, and the lab always keeps at least one admin.

## Requirements

| Requirement | In this epic | Roles | The user sees |
| ----------- | ------------ | ----- | ------------- |
| US6 Sign up and wait for approval | Sign up, log in, log out. A new account waits for approval. Because pages are only created from E03 on, "cannot create pages" here means "cannot reach the contributor area". | Anonymous visitor, pending account, rejected account, approved contributor | After sign-up: "waiting for approval". After approval: the (still empty) contributor area. After rejection: "Your sign-up was not approved", and never the contributor area. |
| US10 Approve or reject sign-ups | The admin's list of pending sign-ups, with approve and reject. | Admin | A list of pending sign-ups (name, email, sign-up date), each with Approve and Reject. When the list is empty: "No pending sign-ups". |
| US14 Make or remove admins | The admin's list of approved accounts, with promote and demote. | Admin, approved contributor | A list of approved contributors and admins showing each one's role. A contributor can be made admin and an admin can be made a contributor. Demoting the last admin shows "There must be at least one admin." |
| NFR4 Security | Hashed passwords. Every role check is made on the server. Every admin action refuses everyone who is not an admin. The "someone else's draft" part waits for drafts, which arrive in E03 and E04 (see Open questions). | Anonymous visitor, pending account, rejected account, approved contributor | Admin pages and contributor pages refuse anyone without the right role, even when the URL is typed in by hand. |
| NFR5 Privacy (GDPR) | An account stores only name, email and password hash, plus its role and approval status. Only the session cookie, which is strictly necessary. | Everyone | No cookie until someone logs in. After login, exactly one cookie. No tracking or analytics. |

## Rules

- Every new account starts as a **pending contributor**. Nobody can choose their own role or approve themselves.
- Name, email and password are required. Two accounts can't share an email, even if the letter case differs. A password needs at least 8 characters.
- Only **approved contributors and admins** reach the contributor area. A pending or rejected account can't reach it by any route, including a typed URL.
- Only **admins** reach the admin pages and admin actions. These are refused: an anonymous visitor, a pending account, a rejected account and an approved contributor. The server refuses them. Hiding a button doesn't count.
- An admin can approve or reject only a **pending** sign-up. **Rejection is final:** a rejected account can never be approved later and can never create content, and its email stays taken.
- Only an **approved** account can be promoted to admin. Pending and rejected accounts can't be promoted.
- An admin can demote any admin, including themselves, unless that admin is the **last** one. There is always at least one admin, even when two admins demote each other at the same moment.
- Approving, rejecting, promoting or demoting someone takes effect at that person's **next page load**, without logging in again.
- A failed login gives the same message whether the email is unknown or the password is wrong.
- A password is stored only as a hash. It is never shown, logged or sent back by the server.
- The first admin comes from the setup configuration (PRD §7). Nobody can become admin by signing up.
- An account stores only name, email, password hash, role and approval status (NFR5). An anonymous visitor gets no cookie. A logged-in user gets only the session cookie. No tracking.

## Scope

- Sign up (name, email, password), log in and log out.
- A header that shows who is logged in and offers "Log out". Anonymous visitors see "Log in" instead.
- A "waiting for approval" page for pending accounts and a "Your sign-up was not approved" message for rejected accounts.
- An empty contributor area that only approved contributors and admins can reach. E03 fills it.
- Admin: the list of pending sign-ups, with approve and reject (US10).
- Admin: the list of approved accounts, with promote and demote, and protection for the last admin (US14).
- The first admin created from the setup configuration.
- Server-side role checks for every admin action. Hashed passwords. Only the session cookie (NFR4, NFR5).
- Every new page works at 375 px wide (NFR2, cross-cutting).

## Out of scope

- Password reset and every email notification (PRD §6). An admin handles a forgotten password outside the app (PRD §7).
- Changing your own name, email or password. Deleting an account. Deactivating an approved contributor.
- Undoing a rejection.
- Google login (PRD §6).
- Anything about safety pages, including the tests that refuse "someone else's draft" (E03, E04).

## Acceptance criteria

- [x] **C1** A visitor signs up with name, email and password and right away sees "waiting for approval". Typing the URL of the contributor area or an admin page shows the same message instead of the page.
- [x] **C2** Signing up with an email that already has an account, even in different letter case, shows "An account with this email already exists". A password shorter than 8 characters, or a missing name or email, is refused with a message that names the problem.
- [x] **C3** The new sign-up appears in the admin's pending list with name, email and sign-up date. After the admin clicks Approve, the person's next page load (with no new login) opens the empty contributor area, and the account is no longer in the pending list.
- [x] **C4** After the admin rejects a sign-up, that person sees "Your sign-up was not approved" when they log in and never reaches the contributor area. The account leaves the pending list, and signing up again with the same email is refused.
- [x] **C5** A login with a wrong password, or with an unknown email, shows the same message "Email or password is wrong". After login the header shows the user's name. After logout the header shows "Log in", and opening the contributor area asks the user to log in.
- [x] **C6** On the fresh `pnpm qa:serve` copy, the first admin from the setup configuration logs in and reaches the admin pages.
- [x] **C7** An admin promotes an approved contributor, and on their next page load that person reaches the admin pages. The admin then demotes them, and on their next page load they can't reach the admin pages but can still reach the contributor area. Pending and rejected accounts are not offered for promotion.
- [x] **C8** When only one admin exists, demoting that admin shows "There must be at least one admin" and they stay an admin. An automated test shows that two admins demoting each other at the same moment still leaves one admin.
- [x] **C9** An anonymous visitor who opens the contributor area or an admin page is sent to log in. An approved contributor who opens an admin page sees a "no access" message.
- [x] **C10** Automated tests that call the server directly, with no browser, show that every admin action refuses an anonymous visitor, a pending account, a rejected account and an approved contributor.
- [x] **C11** An automated test shows that the stored password is a hash, not the password itself, and that no server response contains the password or its hash.
- [x] **C12** In the browser's storage panel, an anonymous visitor has no cookies and a logged-in user has exactly one, the session cookie. No tracking or analytics requests are made. The account record holds only name, email, password hash, role and status.
- [x] **C13** The sign-up, login, "waiting for approval", contributor-area and admin pages work at 375 px with no horizontal scrolling. `pnpm e2e` checks this at both widths.
- [x] **C14** `pnpm verify` and `pnpm e2e` pass.

## Requirement changes

## Stories

| ID  | Story | Delivers | Covers | Status |
| --- | ----- | -------- | ------ | ------ |
| S02.1 | [Sign up, log in and log out](S02.1-signup-login/story.md) | C1, C2, C5, C9, C11, C12, C13, C14 | US6, NFR4, NFR5 | done |
| S02.2 | [Approve or reject sign-ups](S02.2-approve-signups/story.md) | C1, C3, C4, C6, C9, C10, C13, C14 | US10, NFR4 | done |
| S02.3 | [Share the admin role](S02.3-admin-roles/story.md) | C7, C8, C10, C13, C14 | US14, NFR4 | done |

## Build report

/build-epic E02 · 2026-11-24 · all 3 stories done.

### Stories

| Story | Tickets | Review rounds | QA | Known gaps |
| ----- | ------- | ------------- | -- | ---------- |
| S02.1 Sign up, log in and log out | 6 (BE-01–03, FE-01–03) | 2 (F1 major fixed) | run 1 PASS | F2, F4 (F3 fixed in S02.2) |
| S02.2 Approve or reject sign-ups | 4 (BE-01–02, FE-01–02) | 1 | run 1 PASS | F1–F5, 1 QA observation |
| S02.3 Share the admin role | 3 (BE-01, FE-01–02) | 1 | run 1 PASS | F1, F2, B1 |

### Acceptance criteria

| Criterion | Delivered | By |
| --------- | --------- | -- |
| C1 waiting for approval | yes | S02.1, S02.2 |
| C2 sign-up refusals | yes | S02.1 |
| C3 pending list and approve | yes | S02.2 |
| C4 reject | yes | S02.2 |
| C5 login, header, logout | yes | S02.1 |
| C6 first admin from setup configuration | yes | S02.2 |
| C7 promote and demote | yes | S02.3 |
| C8 last admin, simultaneous demotions | yes | S02.3 |
| C9 anonymous sent to login, contributor sees "no access" | yes | S02.1, S02.2 |
| C10 every admin action refuses the four roles (API tests) | yes | S02.2, S02.3 |
| C11 password stored as a hash, never returned | yes | S02.1 |
| C12 one session cookie, no tracking, minimal account record | yes | S02.1 |
| C13 375 px without sideways scroll | yes | S02.1–S02.3 |
| C14 `pnpm verify` and `pnpm e2e` pass | yes | final checks below |

### Findings and bugs

- **Fixed:** S02.1 F1 (major) — the Vite dev proxy rewrote `Host`, so the origin check refused every sign-up, login and logout under `pnpm dev`. S02.1 F3 — the contributor-area width check now uses a real approved account.
- **Disputed:** none.
- **Known gaps (minor, not fixed):**
  - S02.1 F2: a failed logout (500 or network error) shows no message.
  - S02.1 F4: a failed background refresh of "me" replaces the page with the error state and the header with "Log in".
  - S02.2 F1: no index on `users.role` / `users.status`; the design doesn't record the exception (about 100 rows, so no speed effect).
  - S02.2 F2: `.env.example` has the `BOOTSTRAP_ADMIN_*` settings active with an example password; a server set up by copying it starts with an admin whose password is public.
  - S02.2 F3: if no admin exists yet, whoever first signs up with the configured `BOOTSTRAP_ADMIN_EMAIL` becomes admin on the next start; the risk isn't listed in the design.
  - S02.2 F4: after a failed approve or reject, keyboard focus falls to the page body.
  - S02.2 F5 and S02.3 F2: documentation out of date (S02.1 Verification line numbers; S02.2 AC8 says only `PENDING`).
  - S02.2 QA observation: a rejected account still sees the "Contributor area" link.
  - S02.3 F1: a promotion and a self-demotion at the same moment can wrongly refuse the demotion (fails safe; retry works).
  - S02.3 B1: after removing your own admin role, the page's list reload logs a 403 in the console.

### Migrations

- `1795521437455-CreateUsersAndSessions` (S02.1 BE-01): creates `users` and `sessions`. Reviewed and approved by the user; **ran on the development database** on 2026-11-24, after Docker disk space was freed.

### Differences from the design recorded by the developers

- `GET /auth/me` is public and returns `{user: null}` for visitors (decision E02-D3; project design doc §4 still says signed-in).
- Migration keeps role and status values as literal text; the entity builds the CHECKs from the shared constants, and a test keeps them equal. `users_name_check` added from the design's Data section.
- The two global guards live in different modules; a test proves the origin check runs before the access check.
- `COOKIE_SECURE` accepts `true` or `false`, defaulting to true only in production. Two E01 `TC-7.3` config tests now also expect it (architect: acceptable).
- The bootstrap admin settings are held as one object, so a partial set is impossible in code; `.env.example` lists them active (see S02.2 F2).
- Approve and reject share one web hook; each row owns its mutation. Role buttons carry `aria-label="<action> <name>"`.
- Two S02.2 test cases expecting `status=APPROVED` to be refused were removed when S02.3 allowed it (architect: a contract change, not a weakened test).
- Added beyond the tickets: a shared `TextField` component, `e2e/helpers/accounts.ts`, and `createTestApp` accepting test-only controllers.

### Where to look first

- `apps/api/src/modules/auth/access.guard.ts` and `apps/api/src/common/request-origin.guard.ts`: every access decision.
- `apps/api/src/modules/users/users.service.ts`: `decideSignUp` and `changeRole` (locks and the last-admin rule).
- `apps/api/src/common/password.ts`: scrypt settings and the dummy hash.
- `apps/api/src/modules/users/bootstrap-admin.service.ts` and `.env.example`: S02.2 F2 and F3.
- `apps/web/src/components/RequireAccount.tsx`: the page gate.
- `apps/web/vite.config.ts`: the dev proxy fix.

### Checks (final, 2026-11-24)

- `pnpm verify`: pass — shared 71, API unit 133, web 117, API integration 169 tests; docs-check OK.
- `pnpm e2e`: 52 passed (26 at 1280 px, 26 at 375 px).
- `node .claude/tools/docs-check.mjs`: OK (61 docs, 8 epics).

### How to try it

Run `pnpm qa:serve` and open `http://localhost:4100`. The setup admin is `setup.admin@labsafe.test` / `setup-admin-password` (`e2e/test-env.ts`).

1. **Visitor:** open `/contribute` → you're sent to log in. Sign up with a name, an email and an 8+ character password → "waiting for approval". Try the same email in capitals → "An account with this email already exists".
2. **Admin:** in a private window, log in as the setup admin → the header shows "Sign-ups" and "Accounts". Open Sign-ups, approve your new account.
3. **Contributor:** back in the first window, reload → the contributor area, without logging in again. Open `/admin/sign-ups` → "No access".
4. **Admin:** sign up a second account and reject it ("Yes, reject") → that person sees "Your sign-up was not approved".
5. **Admin:** on Accounts, "Make admin" your contributor → after a reload they see the admin links. "Remove admin" → they lose them. Remove admin from the setup admin while it is the only admin → "There must be at least one admin".
6. **Phone:** repeat any page at 375 px wide → nothing scrolls sideways.

Also outside the build: the hand check of S02.1 F1 left one pending account `f1check-…@example.com` in the development database, and another project's container (`mmsr-frontend-1`) also listens on port 5173.

## Verification

**GREEN** · 2026-11-24

No defect is open. The code on `epic/E02-accounts-access` (no commits beyond `master`; all E02 work is uncommitted) matches [design.md](design.md), the three stories and the project design doc after the updates listed under "Changes".

- **Stories:** S02.1, S02.2 and S02.3 are `done`, each with a latest review round of APPROVE, a QA run 1 PASS and architect **GREEN** ([S02.1](S02.1-signup-login/story.md), [S02.2](S02.2-approve-signups/story.md), [S02.3](S02.3-admin-roles/story.md)). Every AC of the three stories (17 + 12 + 12) has at least one test titled `S02.x AC<n>` in `apps/api/test`, `apps/web/src`, `packages/shared/src` or `e2e/tests`. There is no `epic-review.md`; the epic had no feedback round.
- **Criteria C1–C14:** delivered as mapped in the story table; evidence per criterion is in each story's Verification. C14: `pnpm verify` passes (shared 71, API unit 133, web 117, API integration 169, docs-check OK) and `pnpm e2e` 52 passed (26 at 1280 px, 26 at 375 px), as recorded in the build report.
- **Access (NFR4):** `apps/api/src/modules/auth/access.guard.ts:27-29` refuses a route without a level; `apps/api/src/modules/users/admin-users.controller.ts:17` puts `@Admin()` on the whole controller; `apps/api/src/app.module.ts:45` registers `RequestOriginGuard` before `AuthModule`'s `AccessGuard` (`auth.module.ts:19`). The refusal matrices for anonymous, pending, rejected and contributor callers run over HTTP in `apps/api/test/admin-sign-ups.int.test.ts:309-352` and `admin-roles.int.test.ts:389-435`.
- **Data rules:** where design.md "Data" puts them: `users` CHECKs and unique email in `apps/api/src/db/migrations/1795521437455-CreateUsersAndSessions.ts`, mirrored by `user.entity.ts` and checked by the schema-builder test; approve and reject as one conditional `UPDATE` (`users.service.ts:142-159`); role changes in one transaction with the admin rows locked (`users.service.ts:169-198`); sign-up, login and the first admin each in one transaction. `users.role` / `users.status` are deliberately not indexed (now recorded).
- **Privacy and secrets (NFR5, C11, C12):** scrypt hashes only (`apps/api/src/common/password.ts`); responses built by `toCurrentUserResponse` / `toAdminUserResponse`, which have no hash field; one `labsafe_session` cookie (`session-cookie.ts:22-29`). The first admin's settings are `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` and `BOOTSTRAP_ADMIN_NAME`, all three or none (`apps/api/src/common/config.ts:20-24,62-75`); nothing reads `SEED_ADMIN_*`.
- **Web:** the routes in `apps/web/src/App.tsx` match the page list in `apps/web/CLAUDE.md` (`/signup`, `/login`, `/contribute`, `/admin/sign-ups`, `/admin/accounts`); every protected page sits under `RequireAccount`.
- **Open minor gaps, left by the user (not defects):** S02.1 F2, F4; S02.2 F2 (`.env.example` placeholder password, now under design.md "Risks"), F3 (behaviour kept, risk now recorded), F4, the QA observation; S02.3 F1 (accepted risk, recorded), B1. NFR4's "someone else's draft" part waits for E03 and E04 (open question 1).
- **Action for the user, outside the code:** the development `.env` still uses `SEED_ADMIN_*` names, which nothing reads, so `pnpm dev` starts without an admin and logs a warning. Rename them to the three `BOOTSTRAP_ADMIN_*` settings, with your own password; agents may not edit `.env`.

## Open questions

1. **NFR4 asks for tests on "someone else's draft", but drafts don't exist until E03.** Chosen: E02 proves hashed passwords, server-side checks and the refusal of every admin action. At E02 acceptance, NFR4 is recorded as partly met, with the draft part listed as a known gap that E03 (submitting) and E04 (editing your own submissions, US9) close. This follows the pattern E01 used for NFR2. The epic list doesn't change.
2. **Can a rejection be undone, and can a rejected person sign up again?** Chosen: no to both. US6 says a rejected account can never create content, and this is the simplest safe reading. A mistaken rejection is fixed outside the app.
3. **Password rules.** Chosen: at least 8 characters, with no other complexity rules.
4. **Saying "An account with this email already exists" reveals that the email is registered.** Chosen: accept this so sign-up stays simple. Login still doesn't reveal it (C5).
5. **Should an admin be able to deactivate an approved contributor who leaves the lab?** Chosen: not built, because the PRD doesn't ask for it. The user can raise it through `/change-request`.

## Changes

- 2026-11-24 · Goal, requirements, rules, scope, out of scope, acceptance criteria C1–C14 and open questions written from the epic list's goal, scope and exit criteria. The old "Exit criteria" became C1–C14 and the old "Change requests" section was dropped (`/design-epic`, first design).
- 2026-11-24 · Technical design ([design.md](design.md)), stories S02.1–S02.3 with their tickets, and the story table added (`/design-epic`, first design).
- 2026-11-24 · `/complete-epic`: deviations recorded. [design.md](design.md): no index on `users.role` / `users.status`, CHECK literals in the migration, login's session clean-up, guard order and dev proxy, all three `BOOTSTRAP_ADMIN_*` settings or none, and three new risks (bootstrap email, `.env.example` placeholder, false `LAST_ADMIN` under a concurrent promotion). [Design doc](../../technical-design/design-doc.md) §4 (`GET /auth/me` Public, E02-D3), §5, §8, §9, §10, §11 and D14. S02.1 and S02.2 verification references, S02.2 AC8 and contract (`APPROVED` allowed since S02.3), S02.2 and S02.3 known gaps. `apps/api/CLAUDE.md` (access decorators, `BOOTSTRAP_ADMIN_*` all three or none, `SEED_ADMIN_*` not read, index exception, test helpers) and `apps/web/CLAUDE.md` (the account gate, e2e helpers; page list already complete). Verification written: GREEN.
- 2026-11-24 · `/complete-epic` (product-manager): C1–C14 ticked from the story Verifications, the `S02.x AC<n>` tests, QA run 1 of each story (PASS) and the final checks. Acceptance log entry E02 GREEN added to the [PRD](../../prd/PRD.md) §8. NFR4 recorded as partly met (open question 1); E03 and E04 close the draft part. No requirement changes.
