import {
  EMERGENCY_EQUIPMENT,
  HAZARD_TYPES,
  PROTECTIVE_EQUIPMENT,
  type EmergencyEquipmentItem,
} from '@labsafe/shared';
import type { FieldPath } from 'react-hook-form';
import { fieldId, type SafetyPageFormValues } from './form-values';

// The names the error summary (S03.1 AC9–AC12) gives to every issue path the shared
// `SafetyPageContent` or the server's `fields` can produce, the input each one links to, and
// the order of the form. Top-level names follow the form's labels; an indexed path is named
// after its item ("How does the Vacuum / implosion hazard arise?").

/** Every field in the order of the form (AC1), with its name in the summary. */
const FIELD_LABELS: Record<keyof SafetyPageFormValues, string> = {
  name: 'Name',
  photoId: 'Photo',
  manufacturer: 'Manufacturer',
  model: 'Model',
  category: 'Category',
  labRoomId: 'Lab room',
  description: 'Short description',
  responsibleName: "Responsible person's name",
  responsibleContact: "Responsible person's contact",
  hazardLevel: 'Hazard level',
  trainingRequired: 'Training required before first use',
  trainingGivenBy: 'Who gives the training',
  hazards: 'Hazards',
  noSignificantHazards: 'No significant hazards',
  pictograms: 'GHS pictograms',
  protectiveEquipment: 'Personal protective equipment (PPE)',
  standardLabAttireOnly: 'No PPE beyond standard lab attire',
  beforeUse: 'Before use',
  safeOperation: 'Safe operation',
  doNot: 'Do NOT',
  emergency: 'Emergency & first aid',
  emergencyPhone: 'Emergency phone number',
  emergencyEquipment: 'Emergency equipment',
};

const FIELD_ORDER = Object.keys(FIELD_LABELS);
const EMERGENCY_ORDER: readonly string[] = EMERGENCY_EQUIPMENT.map((item) => item.value);

/** The ticked items an indexed label is built from. */
export type LabelValues = Pick<SafetyPageFormValues, 'hazards' | 'protectiveEquipment'>;

function isTopField(name: string | undefined): name is keyof SafetyPageFormValues {
  return name !== undefined && Object.hasOwn(FIELD_LABELS, name);
}

/** True when `path` names a field of the form, so `setError(path)` puts it on the form. */
export function isFieldPath(path: string): path is FieldPath<SafetyPageFormValues> {
  return isTopField(path.split('.')[0]);
}

/** The summary's name for the issue at `path`, or undefined for a path outside the form. */
export function fieldLabel(path: string, values: LabelValues): string | undefined {
  const [top, second, third] = path.split('.');
  if (!isTopField(top)) {
    return undefined;
  }
  if (second === undefined) {
    return FIELD_LABELS[top];
  }
  const index = Number(second);
  if (top === 'hazards' && third === 'note') {
    const type = values.hazards[index]?.type;
    const label = HAZARD_TYPES.find((hazard) => hazard.value === type)?.label;
    return label ? `How does the ${label} hazard arise?` : 'How does this hazard arise?';
  }
  if (top === 'protectiveEquipment' && third === 'note') {
    const item = values.protectiveEquipment[index]?.item;
    const label = PROTECTIVE_EQUIPMENT.find((ppe) => ppe.value === item)?.label;
    return label ? `Note for ${label}` : 'PPE note';
  }
  if (top === 'emergencyEquipment') {
    return (
      EMERGENCY_EQUIPMENT.find((item) => item.value === (second as EmergencyEquipmentItem))
        ?.label ?? FIELD_LABELS.emergencyEquipment
    );
  }
  // An item of a list itself (`hazards.0.type`, `pictograms.1`): named after the list.
  return FIELD_LABELS[top];
}

/** The id of the input the summary links to for the issue at `path`. */
export function fieldTarget(path: string): string {
  const [top, second, third] = path.split('.');
  if ((top === 'hazards' || top === 'protectiveEquipment') && third === 'note') {
    return fieldId(`${top}.${second}.note`);
  }
  if (top === 'emergencyEquipment' && second !== undefined) {
    return fieldId(`emergencyEquipment.${second}`);
  }
  return fieldId(top ?? path);
}

/** One line of the error summary. */
export type SummaryItem = {
  path: string;
  label: string | undefined;
  message: string;
  target: string;
};

const SKIPPED_KEYS = new Set(['message', 'type', 'types', 'ref', 'root']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Every message in react-hook-form's nested `errors`, with its dotted path. */
function flatten(errors: unknown, prefix: string, out: { path: string; message: string }[]) {
  if (!isRecord(errors)) {
    return;
  }
  if (prefix && typeof errors.message === 'string' && errors.message) {
    out.push({ path: prefix, message: errors.message });
  }
  for (const [key, value] of Object.entries(errors)) {
    if (!SKIPPED_KEYS.has(key)) {
      flatten(value, prefix ? `${prefix}.${key}` : key, out);
    }
  }
}

/** Where `path` sits in the form: its field, then its item (list index or emergency item). */
function rank(path: string): [number, number] {
  const [top, second] = path.split('.');
  const field = FIELD_ORDER.indexOf(top ?? '');
  const fieldRank = field === -1 ? FIELD_ORDER.length : field;
  if (second === undefined) {
    return [fieldRank, 0];
  }
  const item = top === 'emergencyEquipment' ? EMERGENCY_ORDER.indexOf(second) : Number(second);
  return [fieldRank, Number.isNaN(item) ? 0 : item + 1];
}

/** The summary's lines for react-hook-form's `errors`, in the order of the form. */
export function summaryItems(errors: unknown, values: LabelValues): SummaryItem[] {
  const found: { path: string; message: string }[] = [];
  flatten(errors, '', found);
  return found
    .map((entry) => ({ entry, order: rank(entry.path) }))
    .sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1])
    .map(({ entry }) => ({
      ...entry,
      label: fieldLabel(entry.path, values),
      target: fieldTarget(entry.path),
    }));
}
