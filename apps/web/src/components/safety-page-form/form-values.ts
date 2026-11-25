import {
  EMERGENCY_EQUIPMENT,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  PROTECTIVE_EQUIPMENT,
  type Category,
  type EmergencyEquipmentItem,
  type HazardLevel,
  type HazardPictogram,
  type HazardType,
  type ProtectiveEquipmentItem,
  type SafetyPageContent,
} from '@labsafe/shared';
import type { z } from 'zod';

// The values the safety page form holds (S03.1 FE-02), and the mapping to and from the shared
// `SafetyPageContent`. Field names are the contract's, so a schema or server issue path
// (`description`, `hazards.2.note`, `emergencyEquipment.EYEWASH`) names its form field directly.
// The ticked hazards, pictograms and PPE items are held in the contract's shape and kept in PRD
// order (FE-03), so the index in `hazards.2.note` is the same in the form and in the content.

/** The training radios: nothing chosen yet, Yes or No. */
export type TrainingChoice = '' | 'yes' | 'no';

/** One ticked hazard type and how it arises. */
export type HazardChoice = { type: HazardType; note: string };

/** One ticked PPE item and its optional note ('' for none). */
export type ProtectiveEquipmentChoice = { item: ProtectiveEquipmentItem; note: string };

/** One emergency item: a location, or "Not applicable" (which clears the location). */
export type EmergencyEquipmentChoice = { location: string; notApplicable: boolean };

export type SafetyPageFormValues = {
  // Identity
  name: string;
  photoId: string | null;
  manufacturer: string;
  model: string;
  category: Category | '';
  labRoomId: string;
  description: string;
  responsibleName: string;
  responsibleContact: string;
  // Risk at a glance
  hazardLevel: HazardLevel | '';
  trainingRequired: TrainingChoice;
  trainingGivenBy: string;
  // Hazards and protection
  hazards: HazardChoice[];
  noSignificantHazards: boolean;
  pictograms: HazardPictogram[];
  protectiveEquipment: ProtectiveEquipmentChoice[];
  standardLabAttireOnly: boolean;
  // Guidelines
  beforeUse: string;
  safeOperation: string;
  doNot: string;
  emergency: string;
  // Emergency info
  emergencyPhone: string;
  emergencyEquipment: Record<EmergencyEquipmentItem, EmergencyEquipmentChoice>;
};

/** Every emergency item with no location and not "Not applicable". */
function emptyEmergencyEquipment(): Record<EmergencyEquipmentItem, EmergencyEquipmentChoice> {
  return Object.fromEntries(
    EMERGENCY_EQUIPMENT.map((item) => [item.value, { location: '', notApplicable: false }]),
  ) as Record<EmergencyEquipmentItem, EmergencyEquipmentChoice>;
}

const HAZARD_ORDER: readonly HazardType[] = HAZARD_TYPES.map((item) => item.value);
const PICTOGRAM_ORDER: readonly HazardPictogram[] = HAZARD_PICTOGRAMS.map((item) => item.value);
const PPE_ORDER: readonly ProtectiveEquipmentItem[] = PROTECTIVE_EQUIPMENT.map(
  (item) => item.value,
);

/** `items` sorted by the position of `keyOf(item)` in `order` (the PRD order of a fixed list). */
export function inListOrder<Item, Key>(
  items: readonly Item[],
  order: readonly Key[],
  keyOf: (item: Item) => Key,
): Item[] {
  return [...items].sort((a, b) => order.indexOf(keyOf(a)) - order.indexOf(keyOf(b)));
}

/** The ticked hazards with `type` ticked or unticked, in PRD order; a ticked one starts without a note. */
export function toggleHazard(
  hazards: readonly HazardChoice[],
  type: HazardType,
  ticked: boolean,
): HazardChoice[] {
  const rest = hazards.filter((hazard) => hazard.type !== type);
  return ticked
    ? inListOrder([...rest, { type, note: '' }], HAZARD_ORDER, (hazard) => hazard.type)
    : rest;
}

/** The ticked PPE items with `item` ticked or unticked, in PRD order. */
export function toggleProtectiveEquipment(
  items: readonly ProtectiveEquipmentChoice[],
  item: ProtectiveEquipmentItem,
  ticked: boolean,
): ProtectiveEquipmentChoice[] {
  const rest = items.filter((choice) => choice.item !== item);
  return ticked
    ? inListOrder([...rest, { item, note: '' }], PPE_ORDER, (choice) => choice.item)
    : rest;
}

/** The ticked pictograms with `pictogram` ticked or unticked, in PRD order. */
export function togglePictogram(
  pictograms: readonly HazardPictogram[],
  pictogram: HazardPictogram,
  ticked: boolean,
): HazardPictogram[] {
  const rest = pictograms.filter((value) => value !== pictogram);
  return ticked ? inListOrder([...rest, pictogram], PICTOGRAM_ORDER, (value) => value) : rest;
}

/** What the form sends to `SafetyPageContent`; an unchosen field is left out, so the schema names it. */
export type SafetyPageContentDraft = Partial<z.input<typeof SafetyPageContent>>;

/** One emergency item as the form sends it. */
type EmergencyEquipmentEntryDraft =
  { kind: 'LOCATION'; location: string } | { kind: 'NOT_APPLICABLE' };

/** The new, empty form. */
export const emptyFormValues: SafetyPageFormValues = {
  name: '',
  photoId: null,
  manufacturer: '',
  model: '',
  category: '',
  labRoomId: '',
  description: '',
  responsibleName: '',
  responsibleContact: '',
  hazardLevel: '',
  trainingRequired: '',
  trainingGivenBy: '',
  hazards: [],
  noSignificantHazards: false,
  pictograms: [],
  protectiveEquipment: [],
  standardLabAttireOnly: false,
  beforeUse: '',
  safeOperation: '',
  doNot: '',
  emergency: '',
  emergencyPhone: '',
  emergencyEquipment: emptyEmergencyEquipment(),
};

/**
 * The form's values as the contract's content. Texts are sent as typed (the schema trims them and
 * turns an empty optional text into null); "Who gives the training" is sent only with training
 * Yes (AC3). Hazards, pictograms and PPE items go in PRD order; an emergency item is "Not
 * applicable" or its location (an empty location lets the schema name the item, AC9).
 */
export function toContent(values: SafetyPageFormValues): SafetyPageContentDraft {
  const training =
    values.trainingRequired === 'yes' ? true : values.trainingRequired === 'no' ? false : undefined;
  return {
    name: values.name,
    photoId: values.photoId ?? undefined,
    manufacturer: values.manufacturer,
    model: values.model,
    category: values.category || undefined,
    labRoomId: values.labRoomId || undefined,
    description: values.description,
    responsibleName: values.responsibleName,
    responsibleContact: values.responsibleContact,
    hazardLevel: values.hazardLevel || undefined,
    trainingRequired: training,
    trainingGivenBy: training ? values.trainingGivenBy : null,
    hazards: inListOrder(values.hazards, HAZARD_ORDER, (hazard) => hazard.type).map(
      ({ type, note }) => ({ type, note }),
    ),
    noSignificantHazards: values.noSignificantHazards,
    pictograms: inListOrder(values.pictograms, PICTOGRAM_ORDER, (value) => value),
    protectiveEquipment: inListOrder(
      values.protectiveEquipment,
      PPE_ORDER,
      (choice) => choice.item,
    ).map(({ item, note }) => ({ item, note })),
    standardLabAttireOnly: values.standardLabAttireOnly,
    beforeUse: values.beforeUse,
    safeOperation: values.safeOperation,
    doNot: values.doNot,
    emergency: values.emergency,
    emergencyPhone: values.emergencyPhone,
    emergencyEquipment: Object.fromEntries(
      EMERGENCY_EQUIPMENT.map(({ value }) => {
        const choice = values.emergencyEquipment[value];
        return [
          value,
          choice.notApplicable
            ? { kind: 'NOT_APPLICABLE' as const }
            : { kind: 'LOCATION' as const, location: choice.location },
        ];
      }),
    ) as Record<EmergencyEquipmentItem, EmergencyEquipmentEntryDraft>,
  };
}

/** A stored page as form values, for the edit page (S03.2). */
export function fromContent(content: SafetyPageContent): SafetyPageFormValues {
  return {
    name: content.name,
    photoId: content.photoId,
    manufacturer: content.manufacturer ?? '',
    model: content.model ?? '',
    category: content.category,
    labRoomId: content.labRoomId,
    description: content.description,
    responsibleName: content.responsibleName,
    responsibleContact: content.responsibleContact,
    hazardLevel: content.hazardLevel,
    trainingRequired: content.trainingRequired ? 'yes' : 'no',
    trainingGivenBy: content.trainingGivenBy ?? '',
    hazards: content.hazards.map(({ type, note }) => ({ type, note })),
    noSignificantHazards: content.noSignificantHazards,
    pictograms: [...content.pictograms],
    protectiveEquipment: content.protectiveEquipment.map(({ item, note }) => ({
      item,
      note: note ?? '',
    })),
    standardLabAttireOnly: content.standardLabAttireOnly,
    beforeUse: content.beforeUse,
    safeOperation: content.safeOperation,
    doNot: content.doNot,
    emergency: content.emergency,
    emergencyPhone: content.emergencyPhone,
    emergencyEquipment: Object.fromEntries(
      EMERGENCY_EQUIPMENT.map(({ value }) => {
        const entry = content.emergencyEquipment[value];
        return [
          value,
          entry.kind === 'LOCATION'
            ? { location: entry.location, notApplicable: false }
            : { location: '', notApplicable: true },
        ];
      }),
    ) as Record<EmergencyEquipmentItem, EmergencyEquipmentChoice>,
  };
}

/**
 * The id of a field's input (the first radio of a radio group), from its issue path:
 * `hazards.2.note` → `page-hazards-2-note`. The error summary (FE-04) links to it.
 */
export function fieldId(path: string): string {
  return `page-${path.replaceAll('.', '-')}`;
}
