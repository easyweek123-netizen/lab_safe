---
generated: 2026-11-26
---

# Brief

- Board: E01 ✅ · E02 ✅ · E03 ✅ · E04 ✅ (accepted GREEN 2026-11-26, not yet committed or merged) · E05–E08 planned
- MUST requirements accepted: 16 / 26 (NFR6, NFR2, US6, US10, US14, NFR5, US7, R3, R4, R5, US3, US4, US9, US11, US12, NFR4; R1 partly met and not counted yet)

## Next

1. **You, waiting on your decision: S03.1 AC17's two texts.** AC17 still quotes "…check your connection and submit again." and "…then submit again here."; E04 C18 replaced them with "try again", and the app and its tests follow C18. Approve updating AC17's two texts to the C18 wording, or leave AC17 as a record of E03. Nothing depends on it. **S03.3 F1** (AC3's wording, from E03) is still waiting too; the proposed rewording is in the [E03 Verification](epics/E03-write-submit-page/epic.md#verification).
2. **You:** review the E04 working tree, then commit, push and merge `epic/E04-review-publish` into master. All E04 work is uncommitted; the migration `1795653173748-AddReviewAndPublishing` has already run on the development database.
3. `git switch -c epic/E05-updates-deletion`, then `/design-epic E05`: Page updates and deletion (US8, US13, R6). It is next in the frozen delivery order, and it finishes what E04 accepted for new pages only. Specifically:
   - the "Update" mark in "Pages to review" and the live version next to an update in the preview (US11, US12);
   - updates in "My submissions" with Pending, Approved and Rejected (US9);
   - delete in the admin refusal tests (NFR4), and "contributors edit only their own drafts" for suggested updates.

   It also creates the hardest leak case for R1, a pending update of a live page, before search (E06) and the assistant (E07) are built, so both can be tested against it from the start.

## Known gaps worth fixing

- **Inside E05, because "Suggest an update" reuses the same form and review flow:**
  - S04.3 F1: a rejection that arrives while the author has the edit form open stays hidden. Saving then resubmits the page and clears the admin's note before the author has seen it. With updates, more pages will be edited while under review.
  - S04.2 F3: if "Reload the page" itself fails after a "changed since you opened it" refusal, the old preview stays with no message. E05's update previews hit the same path.
- **Before E06, because NFR3 (accessibility) is accepted there:** S04.4 F1 (focus leaves "Change photo" during an upload, so a keyboard user has to find the control again), S04.4 F2 (a photo message can be announced twice by a screen reader).
- **S04.1 F2:** the e2e photo check also passes on a broken image. US3 requires the photo on the public page, so the test should prove it loads. Small; fix it the next time the e2e journeys are touched.
- **S02.2 F2 and F3, before E08 (deployment):** `.env.example` has active `BOOTSTRAP_ADMIN_*` lines with an example password, and if no admin exists yet, whoever first signs up with the configured bootstrap email becomes admin on the next start. Set real bootstrap settings before the first public start.
- **Small things, low priority:** S04.1 F1 (an unused label helper), S04.1 B1 (an unknown preview id shows "Loading…" for about 1 s), S04.2 F1 (an out-of-date code comment), S04.3 B1 (an old confirmation on `/contribute` survives a reload), S03.1 F2 (the error summary would skip an error on a hazard's type; the form can't produce one today), the S03.2 QA observation ("Edit safety page" shows briefly while loading a page that isn't yours), S02.1 F2 (a failed logout shows no message), S02.2 F4 (keyboard focus lost after a failed approve or reject of a sign-up), the S02.2 QA observation (a rejected account still sees the "Contributor area" link), S02.3 F1 (a concurrent promotion can wrongly refuse a self-demotion; it fails safe), S02.3 B1 (a 403 in the console after removing your own admin role).

## Risks

- **R1 and M3 (0 leaks) are not done yet.** E04 proved it for pending and rejected pages and their photos. E05 must prove that text only in a pending update never reaches the public page or its photo, and that a deleted page is "not found" everywhere. E06 and E07 must prove the same for search and the assistant. R1 is accepted only when all three have.
- **Accepted requirements that E05 must extend.** US9, US11 and US12 were accepted for new pages, because updates don't exist yet. If E05's design leaves out the "Update" mark, the live version next to it, or updates in "My submissions", those three are no longer met. The same holds for delete in the NFR4 refusal tests.
- **The 3-second goal (NFR1, M1, M2) is still unmeasured.** It is the user's own goal and comes only with E06. Until then a student reaches a page only by its address.
- **Lab rooms are still placeholders** (PRD §7 open question). Replace them with the real rooms before the demo.
- **The critical path is long.** 10 MUST requirements are still open (US1, US2, US5, US8, US13, R1, R2, R6, NFR1, NFR3). Keep E05 to the PRD and nothing more.
