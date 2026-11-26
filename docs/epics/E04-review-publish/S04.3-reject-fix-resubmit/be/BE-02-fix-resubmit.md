---
id: BE-02
story: S04.3
layer: be
status: done # todo | doing | done
depends_on: [BE-01]
covers: [AC4, AC6, AC7, AC8, AC9]
updated: 2026-11-26
---

# BE-02 Fix and resubmit

**Goal:** the author reads the note and resubmits their rejected page as pending; nobody else can read or change it, and nothing of it is public. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/api/src/modules/submissions/submissions.service.ts`, `submission.response.ts`
- create `apps/api/test/rejected-pages.int.test.ts`

## Constraints

- `PUT /submissions/:id` on the author's `REJECTED` revision: in the existing transaction, after the same checks and the content and child-row replacement, set `PENDING`, `submitted_at` now, `reviewed_by`, `reviewed_at` and `review_note` null, `version` + 1 (E04-D5). A `PENDING` correction keeps `submitted_at`; an `APPROVED` page keeps the S04.2 409. Everyone else, admins included, 404 (E03-D4).
- `read` and `listMine` return `reviewNote` only for `REJECTED`, in the same query.
- The read rule for a rejected page is E03's (author or approved admin); add no new path.
- Integration tests titled `S04.3 AC<n>`: the note in both reads, absent for pending and approved (AC4); resubmission columns and the queue order by the new date (AC6); an incomplete body leaves the page rejected with its note (AC7); the read, change and photo matrix with the unknown-id body comparison (AC8); the anonymous checks while rejected, and after resubmitting with a new photo and approving, the replaced photo 404 to anonymous and 200 to its owner (AC9).
- Schema change: no.

## Out of scope

The web pages (FE-02).

## Implementation notes

**Files changed:**

apps/api/src/modules/submissions/submissions.service.ts
apps/api/src/modules/submissions/submission.response.ts
apps/api/test/rejected-pages.int.test.ts
apps/api/test/submission-edit.int.test.ts

**Differences from the ticket:**

- **One existing test changed because S04.3 AC6 reverses it:** `submission-edit.int.test.ts` `S03.2 AC5 answers 404 for a revision that is no longer pending` asserted that the author's `PUT` of a `REJECTED` revision is 404 (S04.2 BE-03's notes: "still answers 404 until S04.3"). It is now `S03.2 AC5 answers 404 to everyone but the author for a revision that is no longer pending; the author resubmits it (S04.3 AC6)`: the same rejected fixture, and anonymous, pending, rejected, another contributor and an admin all get 404 with every row unchanged (more callers than before), then the author's save answers 200 `PENDING` with `reviewNote: null`. The 404 assertion was kept for every caller it still applies to; only the author's answer changed, as the story requires. No other existing test changed; the web fixtures needed no change (no contract change in this ticket).
- `reviewNote` comes from a `noteOf(status, note)` helper in `submission.response.ts`, next to `slugOf`: the note is returned only for `REJECTED`. `listMine` selects `reviewNote` in its one query; `read` and `update` get it from `loadSubmission`, which already selects every revision column. BE-01's placeholders are gone.
- `update`: the 404 for a non-`PENDING`, non-`APPROVED` status is gone (only `REJECTED` remains). A `REJECTED` revision gets, in the same `UPDATE` as the content and under the same row lock, `status = 'PENDING'`, `submitted_at` and `updated_at` the same `now`, `reviewed_by`, `reviewed_at` and `review_note` null, `version + 1`. The S03.1 room and photo checks run first, so a refused resubmission (400 from the schema or from those checks) changes nothing and the page stays rejected with its note. The log line says "resubmitted" with the id only.
- `kind` stays as it was (`NEW` for these pages); the ticket does not mention it.
- Extra tests beyond the ticket: a pending correction still keeps its `submittedAt`; the resubmitted page is approved with its new version and the stored note is null; the rejected page's note is in no other contributor's list; the public body after approval has no note; an admin or other caller using their own photo on a rejected page is 404 too; an unknown room plus another account's photo on resubmission names both fields.
