import {
  HAZARD_TYPES,
  PROTECTIVE_EQUIPMENT,
  type Submission,
  type SubmissionSummary,
} from '@labsafe/shared';
import type { InstrumentRevision } from '../instruments/instrument-revision.entity';
import type { RevisionHazard } from '../instruments/revision-hazard.entity';
import type { RevisionProtectiveEquipment } from '../instruments/revision-protective-equipment.entity';

/** A revision with its hazard and PPE rows, as `toSubmissionResponse` needs it. */
export type SubmissionFields = Omit<InstrumentRevision, 'hazards' | 'protectiveEquipment'> & {
  hazards: Array<Pick<RevisionHazard, 'hazardType' | 'note'>>;
  protectiveEquipment: Array<Pick<RevisionProtectiveEquipment, 'equipmentItem' | 'note'>>;
};

/** Position of each value in its PRD §4.2 list, so child rows come back in list order. */
const HAZARD_ORDER = new Map(HAZARD_TYPES.map(({ value }, index) => [value as string, index]));
const PPE_ORDER = new Map(PROTECTIVE_EQUIPMENT.map(({ value }, index) => [value as string, index]));

const byOrder =
  <Item>(order: Map<string, number>, key: (item: Item) => string) =>
  (a: Item, b: Item) =>
    (order.get(key(a)) ?? 0) - (order.get(key(b)) ?? 0);

/**
 * A stored revision as the shared `Submission`: never the entity, the photo bytes or the
 * submitter's email. Hazards and PPE items are in PRD §4.2 order (the rows have no order).
 */
export function toSubmissionResponse(
  revision: SubmissionFields,
  submitter: { id: string; name: string },
): Submission {
  return {
    id: revision.id,
    kind: revision.kind,
    status: revision.status,
    submittedAt: revision.submittedAt.toISOString(),
    updatedAt: revision.updatedAt.toISOString(),
    submittedBy: { id: submitter.id, name: submitter.name },
    content: {
      name: revision.name,
      photoId: revision.photoId,
      manufacturer: revision.manufacturer,
      model: revision.model,
      category: revision.category,
      labRoomId: revision.labRoomId,
      description: revision.description,
      responsibleName: revision.responsibleName,
      responsibleContact: revision.responsibleContact,
      hazardLevel: revision.hazardLevel,
      trainingRequired: revision.trainingRequired,
      trainingGivenBy: revision.trainingGivenBy,
      hazards: [...revision.hazards]
        .sort(byOrder(HAZARD_ORDER, (hazard) => hazard.hazardType))
        .map((hazard) => ({ type: hazard.hazardType, note: hazard.note })),
      noSignificantHazards: revision.noSignificantHazards,
      pictograms: [...revision.hazardPictograms],
      protectiveEquipment: [...revision.protectiveEquipment]
        .sort(byOrder(PPE_ORDER, (item) => item.equipmentItem))
        .map((item) => ({ item: item.equipmentItem, note: item.note })),
      standardLabAttireOnly: revision.standardLabAttireOnly,
      beforeUse: revision.beforeUse,
      safeOperation: revision.safeOperation,
      doNot: revision.doNot,
      emergency: revision.emergency,
      emergencyPhone: revision.emergencyPhone,
      emergencyEquipment: revision.emergencyEquipment,
    },
  };
}

/** One row of "My submissions". */
export function toSubmissionSummaryResponse(
  revision: Pick<InstrumentRevision, 'id' | 'name' | 'status' | 'submittedAt'>,
): SubmissionSummary {
  return {
    id: revision.id,
    name: revision.name,
    status: revision.status,
    submittedAt: revision.submittedAt.toISOString(),
  };
}
