---
generated: 2026-11-25
---

# Brief

- Board: E01 ✅ · E02 ✅ · E03 ✅ (accepted GREEN 2026-11-25, not yet committed or merged) · E04–E08 planned
- MUST requirements accepted: 10 / 26 (NFR6, NFR2, US6, US10, US14, NFR5, US7, R3, R4, R5; NFR4 partly met and not counted yet)

## Next

1. **You, waiting on your decision: S03.3 F1 (AC3 wording).** AC3 has the contributor submit a half-filled form offline, which can only show the "fix these fields" summary, never the network message. The behaviour and the test are right (the test completes the page first); only the wording is wrong. Approve the architect's rewording in the [E03 Verification](epics/E03-write-submit-page/epic.md#verification), or leave it as it is. Nothing else depends on it.
2. **You:** review the E03 working tree, then commit, push and merge `epic/E03-write-submit-page` into master. All E03 work is uncommitted; the migration `1795541562254-CreateSafetyPageTables` has already run on the development database. If not done yet, rename `SEED_ADMIN_*` in your `.env` to the three `BOOTSTRAP_ADMIN_*` settings (from E02; agents may not edit `.env`).
3. `git switch -c epic/E04-review-publish`, then `/design-epic E04`: Review and publish (US3, US4, US9, US11, US12, R1). It is the largest remaining MUST block (6 requirements), and E05, E06 and E07 all wait for it: until a page can be approved, nothing is public, so there is nothing to update, search or ask about. It also closes NFR4.

## Known gaps worth fixing

- **Inside E04, because E04 reuses the safety-page form to fix and resubmit a rejected page (US9):**
  - S03.1 F1: once a photo is shown, a failed photo change isn't announced on any reachable control, and the error summary's "Photo" link does nothing. A screen-reader user can't tell the photo failed; this matters for NFR3 (accessibility) in E06.
  - S03.2 note: the edit page's failure messages say "submit again" although the button says "Save changes". Worth settling when E04 adds "Resubmit".
  - S03.1 B1: an old submit-failure message stays on screen when a re-uploaded photo also fails.
- **S02.2 F2 and F3, before E08 (deployment):** `.env.example` has active `BOOTSTRAP_ADMIN_*` lines with an example password, and if no admin exists yet, whoever first signs up with the configured bootstrap email becomes admin on the next start. Set real bootstrap settings before the first public start.
- **Small things, low priority:** S03.1 F2 (the error summary would skip an error on a hazard's type; the form can't produce one today), the S03.2 note ("Edit safety page" shows briefly while loading a page that isn't yours), S02.1 F2 (a failed logout shows no message), S02.2 F4 (keyboard focus lost after a failed approve or reject), the S02.2 QA observation (a rejected account still sees the "Contributor area" link), S02.3 F1 (a concurrent promotion can wrongly refuse a self-demotion; it fails safe), S02.3 B1 (a 403 in the console after removing your own admin role).

## Risks

- **NFR4 closes only if E04 tests it.** E03 proved the "someone else's draft" refusals for pending pages and photos. Still open: someone else's *rejected* page (US9), and the refusal tests for every new admin action (approve, reject, preview). If the E04 design leaves either out, NFR4 stays open at release. E05 must add delete to the same tests.
- **M3 (0 leaks) gets harder with every epic.** E03 measured it for pending pages (page address and photo). E04 adds rejected pages and the first public pages; E05 adds pending updates of live pages, the hardest case (students must keep seeing the old version).
- **US3's phone check is new.** On a 375 px phone, hazard level, training, hazards, PPE and the emergency number must be visible without scrolling. Plan the E04 page around it from the start.
- **Lab rooms are still placeholders** (PRD §7 open question). Replace them with the real rooms before the demo.
- **The critical path is long.** 16 MUST requirements are still open. Keep E04 to the PRD and nothing more.
