import type { LastApproved, SafetyPageDisplay } from '@labsafe/shared';
import type { LabRoom } from '../meta/lab-room.entity';
import { type RevisionContentFields, toSafetyPageContent } from './revision-content';

/** A revision with its child rows and its lab room, as `toSafetyPageDisplay` needs it. */
export type SafetyPageDisplayFields = Omit<RevisionContentFields, 'labRoom'> & {
  labRoom: Pick<LabRoom, 'id' | 'code' | 'name'>;
};

/**
 * A stored revision as the shared `SafetyPageDisplay`, the one shape `SafetyPageView` renders
 * (E04-D1): the content, the lab room and the latest approval (`null` until S04.2 approves).
 */
export function toSafetyPageDisplay(
  revision: SafetyPageDisplayFields,
  lastApproved: LastApproved | null,
): SafetyPageDisplay {
  return {
    content: toSafetyPageContent(revision),
    labRoom: { id: revision.labRoom.id, code: revision.labRoom.code, name: revision.labRoom.name },
    lastApproved,
  };
}
