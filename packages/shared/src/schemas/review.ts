import { z } from 'zod';
import { SafetyPageDisplay } from './instruments';
import { RevisionKind, RevisionStatus } from './submissions';

// The admin's review (S04.1 API contract). No email anywhere: the submitter is `{ id, name }`.

export const ReviewSubmitter = z.object({
  id: z.uuid(),
  name: z.string(),
});
export type ReviewSubmitter = z.infer<typeof ReviewSubmitter>;

/** One row of "Pages to review"; holds no page content. */
export const ReviewQueueItem = z.object({
  id: z.uuid(),
  name: z.string(),
  kind: RevisionKind,
  submittedBy: ReviewSubmitter,
  /** ISO 8601 date-time in UTC. */
  submittedAt: z.iso.datetime(),
});
export type ReviewQueueItem = z.infer<typeof ReviewQueueItem>;

/** `GET /api/admin/review-queue`: every pending revision, oldest submission first. */
export const ReviewQueue = z.object({
  items: z.array(ReviewQueueItem),
});
export type ReviewQueue = z.infer<typeof ReviewQueue>;

/** `GET /api/admin/submissions/:id`: one revision of any status, as the public page shows it. */
export const ReviewSubmission = z.object({
  id: z.uuid(),
  kind: RevisionKind,
  status: RevisionStatus,
  submittedAt: z.iso.datetime(),
  submittedBy: ReviewSubmitter,
  /** The revision's version; the admin sends it back when deciding (S04.2 AC9, C14). */
  version: z.int().min(1),
  page: SafetyPageDisplay,
});
export type ReviewSubmission = z.infer<typeof ReviewSubmission>;

/** Body of `POST /api/admin/submissions/:id/approve`: the version the admin reviewed. */
export const ApproveSubmissionRequest = z.object({
  version: z.int().min(1),
});
export type ApproveSubmissionRequest = z.infer<typeof ApproveSubmissionRequest>;

/** The answer to an admin's decision; `slug` is the public address of an approved page. */
export const ReviewDecision = z.object({
  id: z.uuid(),
  status: z.enum(['APPROVED', 'REJECTED']),
  slug: z.string().min(1).nullable(),
});
export type ReviewDecision = z.infer<typeof ReviewDecision>;

/** The longest note an admin may write when rejecting a page (S04.3 AC2). */
export const REVIEW_NOTE_MAX = 1000;
const NOTE_MISSING = 'Enter a note for the contributor';

/** Body of `POST /api/admin/submissions/:id/reject`: what the contributor must fix (S04.3). */
export const RejectSubmissionRequest = z.object({
  note: z
    .string({ error: NOTE_MISSING })
    .trim()
    .min(1, { error: NOTE_MISSING })
    .max(REVIEW_NOTE_MAX, { error: `The note must be at most ${REVIEW_NOTE_MAX} characters` }),
});
export type RejectSubmissionRequest = z.infer<typeof RejectSubmissionRequest>;
