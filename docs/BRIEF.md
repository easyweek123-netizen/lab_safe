---
generated: 2026-11-24
---

# Brief

- Board: E01 ✅ · E02 ✅ (accepted GREEN 2026-11-24, not yet committed or merged) · E03–E08 planned
- MUST requirements accepted: 6 / 26 (NFR6, NFR2, US6, US10, US14, NFR5; NFR4 partly met and not counted yet)

## Next

1. **You:** review the E02 working tree, then commit, push and merge `epic/E02-accounts-access` into master. Agents don't commit, and all E02 work is still uncommitted.
2. **You:** in your own `.env`, rename the `SEED_ADMIN_*` settings to `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` and `BOOTSTRAP_ADMIN_NAME`, and choose your own password. Nothing reads `SEED_ADMIN_*`, so until you rename them `pnpm dev` starts without an admin and logs a warning. Agents may not edit `.env`.
3. `/design-epic E03`: Write and submit a safety page (US7, R3, R4, R5). Every later epic depends on it: E04 can't review pages, E06 can't search and E07 can't answer until pages exist. It also closes most of the open NFR4 part ("someone else's draft") and makes M3 measurable for the first time.

## Known gaps worth fixing

- **S02.1 F4, before or inside E03:** if a background refresh of the session fails, the page behind the account gate is replaced by an error. From E03 on, the page editor sits behind that gate, so a short network drop would throw away a contributor's typed page. Decide in `/design-epic E03` whether to fix it there.
- **S02.2 F2 and F3, before E08 (deployment):** `.env.example` has active `BOOTSTRAP_ADMIN_*` lines with an example password, and if no admin exists yet, whoever first signs up with the configured bootstrap email becomes admin on the next start. Neither is a problem on your machine, but both matter on a public server. Set real bootstrap settings before the first public start.
- **Small things, low priority:** S02.1 F2 (a failed logout shows no message), S02.2 F4 (keyboard focus lost after a failed approve or reject), the S02.2 QA observation (a rejected account still sees the "Contributor area" link), S02.3 F1 (a concurrent promotion can wrongly refuse a self-demotion; it fails safe and a retry works), S02.3 B1 (a 403 in the console after removing your own admin role).

## Risks

- **NFR4 is not fully accepted yet.** Its "someone else's draft" tests must be written in E03 (pending pages) and E04 (US9, fixing your own submissions). If an epic design leaves them out, NFR4 stays open at release.
- **The critical path is long.** 20 MUST requirements are still open, and E03 → E04 must both finish before search (E06) and the assistant (E07) can start. E03 is the largest form in the product (every §4.1 field, the photo upload, R3–R5 in both the schema and the database), so keep its scope to the PRD and nothing more.
- **NFR2** is accepted only for account and admin pages so far. Its final check is with real safety pages (E04, E06).
