import type { PublishedSafetyPage } from '@labsafe/shared';
import type { User } from '../users/user.entity';
import { type SafetyPageDisplayFields, toSafetyPageDisplay } from './safety-page-display';

/** A published revision with its child rows, its lab room, the approval date and the approver. */
export type PublishedRevisionFields = SafetyPageDisplayFields & {
  reviewedAt: Date;
  reviewer: Pick<User, 'name'>;
};

/**
 * The public page at `slug` (S04.2 AC4): the S04.1 display mapping with `lastApproved` from
 * `reviewed_at` and the approver's name. No contributor, email, review note or `version`.
 */
export function toPublishedSafetyPageResponse(
  slug: string,
  revision: PublishedRevisionFields,
): PublishedSafetyPage {
  const lastApproved = {
    at: revision.reviewedAt.toISOString(),
    approverName: revision.reviewer.name,
  };
  const page = toSafetyPageDisplay(revision, lastApproved);
  return { slug, page: { ...page, lastApproved } };
}
