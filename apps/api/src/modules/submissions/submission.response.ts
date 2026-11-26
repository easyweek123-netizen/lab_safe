import type { Submission, SubmissionSummary } from '@labsafe/shared';
import type { InstrumentRevision } from '../instruments/instrument-revision.entity';
import type { Instrument } from '../instruments/instrument.entity';
import { type RevisionContentFields, toSafetyPageContent } from '../instruments/revision-content';

/** A revision with its hazard and PPE rows, as `toSubmissionResponse` needs it. */
export type SubmissionFields = RevisionContentFields;

/**
 * The instrument's public address for this revision: only an `APPROVED` revision has one
 * (S04.2 AC10); a pending or rejected revision of a published instrument does not.
 */
function slugOf(
  status: InstrumentRevision['status'],
  instrumentSlug: string | null,
): string | null {
  return status === 'APPROVED' ? instrumentSlug : null;
}

/** The admin's note for the contributor: only a `REJECTED` revision has one (S04.3 AC4). */
function noteOf(status: InstrumentRevision['status'], reviewNote: string | null): string | null {
  return status === 'REJECTED' ? reviewNote : null;
}

/**
 * A stored revision as the shared `Submission`: never the entity, the photo bytes or the
 * submitter's email. Hazards and PPE items are in PRD §4.2 order (the rows have no order).
 * `instrumentSlug` is the instrument's slug, or null.
 */
export function toSubmissionResponse(
  revision: SubmissionFields,
  submitter: { id: string; name: string },
  instrumentSlug: string | null,
): Submission {
  return {
    id: revision.id,
    kind: revision.kind,
    status: revision.status,
    submittedAt: revision.submittedAt.toISOString(),
    updatedAt: revision.updatedAt.toISOString(),
    submittedBy: { id: submitter.id, name: submitter.name },
    content: toSafetyPageContent(revision),
    slug: slugOf(revision.status, instrumentSlug),
    reviewNote: noteOf(revision.status, revision.reviewNote),
  };
}

/**
 * One row of "My submissions", with the public address of an approved page (S04.2 AC10) and the
 * note of a rejected one (S04.3 AC4).
 */
export function toSubmissionSummaryResponse(
  revision: Pick<InstrumentRevision, 'id' | 'name' | 'status' | 'submittedAt' | 'reviewNote'> & {
    instrument: Pick<Instrument, 'slug'>;
  },
): SubmissionSummary {
  return {
    id: revision.id,
    name: revision.name,
    status: revision.status,
    submittedAt: revision.submittedAt.toISOString(),
    slug: slugOf(revision.status, revision.instrument.slug),
    reviewNote: noteOf(revision.status, revision.reviewNote),
  };
}
