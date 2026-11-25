import { z } from 'zod';
import { SafetyPageContent } from './safety-page';

// Submissions (S03.1 API contract, E03 design "Endpoints"). The database CHECKs on the
// revision kind and status are built from these constants (design doc I5).

export const REVISION_KINDS = ['NEW', 'UPDATE'] as const;
export const RevisionKind = z.enum(REVISION_KINDS);
export type RevisionKind = z.infer<typeof RevisionKind>;

export const REVISION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const RevisionStatus = z.enum(REVISION_STATUSES);
export type RevisionStatus = z.infer<typeof RevisionStatus>;

/** One submitted page; `content` parses with the same schema the form uses (E03-D2). */
export const Submission = z.object({
  id: z.uuid(),
  kind: RevisionKind,
  status: RevisionStatus,
  /** ISO 8601 date-times in UTC. */
  submittedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  submittedBy: z.object({
    id: z.uuid(),
    name: z.string(),
  }),
  content: SafetyPageContent,
});
export type Submission = z.infer<typeof Submission>;

/** One row of "My submissions". */
export const SubmissionSummary = z.object({
  id: z.uuid(),
  name: z.string(),
  status: RevisionStatus,
  submittedAt: z.iso.datetime(),
});
export type SubmissionSummary = z.infer<typeof SubmissionSummary>;

/** `GET /api/submissions/mine`: the caller's own submissions, newest first. */
export const MySubmissions = z.object({
  submissions: z.array(SubmissionSummary),
});
export type MySubmissions = z.infer<typeof MySubmissions>;

/** `:id` of `GET` and `PUT /api/submissions/:id` (S03.2 API contract). */
export const SubmissionIdParam = z.object({
  id: z.uuid(),
});
export type SubmissionIdParam = z.infer<typeof SubmissionIdParam>;
