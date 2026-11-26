import type { ReviewDecision, ReviewQueueItem, ReviewSubmission } from '@labsafe/shared';
import type { InstrumentRevision } from '../instruments/instrument-revision.entity';
import {
  type SafetyPageDisplayFields,
  toSafetyPageDisplay,
} from '../instruments/safety-page-display';
import type { User } from '../users/user.entity';

type Submitter = Pick<User, 'id' | 'name'>;

/** One row of "Pages to review": no content and no email (S04.1 AC1). */
export function toReviewQueueItemResponse(
  revision: Pick<InstrumentRevision, 'id' | 'name' | 'kind' | 'submittedAt'> & {
    submitter: Submitter;
  },
): ReviewQueueItem {
  return {
    id: revision.id,
    name: revision.name,
    kind: revision.kind,
    submittedBy: { id: revision.submitter.id, name: revision.submitter.name },
    submittedAt: revision.submittedAt.toISOString(),
  };
}

/**
 * One revision for the admin's preview (S04.1 AC4): the page as `SafetyPageDisplay`, the
 * submitter's id and name, never their email, and the `version` the admin sends back when
 * approving (S04.2 AC9). `lastApproved` stays null in the preview.
 */
export function toReviewSubmissionResponse(
  revision: SafetyPageDisplayFields & { submitter: Submitter },
): ReviewSubmission {
  return {
    id: revision.id,
    kind: revision.kind,
    status: revision.status,
    submittedAt: revision.submittedAt.toISOString(),
    submittedBy: { id: revision.submitter.id, name: revision.submitter.name },
    version: revision.version,
    page: toSafetyPageDisplay(revision, null),
  };
}

/** The answer to an approval (S04.2 AC1): the revision and the page's public address. */
export function toApprovalDecisionResponse(revisionId: string, slug: string): ReviewDecision {
  return { id: revisionId, status: 'APPROVED', slug };
}

/** The answer to a rejection (S04.3 AC1): a rejected revision has no public address. */
export function toRejectionDecisionResponse(revisionId: string): ReviewDecision {
  return { id: revisionId, status: 'REJECTED', slug: null };
}
