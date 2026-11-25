import { z } from 'zod';
import {
  Category,
  EmergencyEquipmentItem,
  HazardLevel,
  HazardPictogram,
  HazardType,
  ProtectiveEquipmentItem,
} from '../lists';

// The content of a safety page (S03.1 API contract, PRD §4.1, R3–R5). One schema for the form
// and the API, for creating and editing (E03-D2). Every text is trimmed before its length is
// checked, so a text of only spaces counts as missing.

const tooLong = (label: string, max: number) => `${label} must be at most ${max} characters`;

/** A required text: trimmed, 1 to `max` characters. Missing, empty or not a string: `missing`. */
function requiredText(max: number, missing: string, label: string) {
  return z
    .string({ error: missing })
    .trim()
    .min(1, { error: missing })
    .max(max, { error: tooLong(label, max) });
}

/** An optional text: trimmed, at most `max` characters; missing or empty becomes null. */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, { error: tooLong(label, max) })
    .nullish()
    .transform((value) => (value ? value : null));
}

/** Refuses an array that holds the same value twice (`key` of each item, or the item itself). */
function unique(key: string | null, message: string) {
  return (items: unknown, ctx: z.RefinementCtx) => {
    if (!Array.isArray(items)) return;
    const values = items
      .map((item: unknown) => (key === null ? item : isRecord(item) ? item[key] : undefined))
      .filter((value): value is string => typeof value === 'string');
    if (new Set(values).size !== values.length) ctx.addIssue({ code: 'custom', message });
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Also run when an item failed, so a duplicate is reported with every other problem.
const ALWAYS = { when: () => true };

const HAZARDS_MISSING = "Choose at least one hazard, or 'No significant hazards'";
const HAZARDS_BOTH = "Choose hazards or 'No significant hazards', not both.";
const PPE_MISSING = "Choose at least one PPE item, or 'No PPE beyond standard lab attire'";
const PPE_BOTH = "Choose PPE items or 'No PPE beyond standard lab attire', not both.";
const TRAINER_MISSING = 'Enter who gives the training';
const TRAINER_MAX = 200;
const TRAINING_WITH_LOW = "A page that requires training can't have a Low hazard level.";
const EMERGENCY_MISSING = "Give a location or choose 'Not applicable'";
const EMERGENCY_LOCATION_MAX = 200;

/** One ticked hazard type with how it arises. */
export const HazardEntry = z.object({
  type: z.enum(HazardType.options, { error: 'Choose a hazard type from the list' }),
  note: requiredText(300, 'Describe how this hazard arises', 'Hazard note'),
});
export type HazardEntry = z.infer<typeof HazardEntry>;

/** One ticked PPE item with an optional note. */
export const ProtectiveEquipmentEntry = z.object({
  item: z.enum(ProtectiveEquipmentItem.options, { error: 'Choose a PPE item from the list' }),
  note: optionalText(200, 'PPE note'),
});
export type ProtectiveEquipmentEntry = z.infer<typeof ProtectiveEquipmentEntry>;

const EmergencyEquipmentEntryShape = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('LOCATION'),
    location: z.string().trim().min(1).max(EMERGENCY_LOCATION_MAX),
  }),
  z.object({ kind: z.literal('NOT_APPLICABLE') }),
]);

/**
 * Where one emergency item is, or that it doesn't apply. Every problem is reported on the item
 * itself (`emergencyEquipment.EYEWASH`), never on `kind` or `location`, because the form shows
 * one message per item.
 */
export const EmergencyEquipmentEntry = z
  .custom<z.input<typeof EmergencyEquipmentEntryShape>>()
  .transform((value, ctx) => {
    const result = EmergencyEquipmentEntryShape.safeParse(value);
    if (result.success) return result.data;
    const tooLongLocation = result.error.issues.some((issue) => issue.code === 'too_big');
    ctx.issues.push({
      code: 'custom',
      input: value,
      message: tooLongLocation ? tooLong('Location', EMERGENCY_LOCATION_MAX) : EMERGENCY_MISSING,
    });
    return z.NEVER;
  });
export type EmergencyEquipmentEntry = z.output<typeof EmergencyEquipmentEntry>;

const EmergencyEquipmentObject = z.object(
  Object.fromEntries(
    EmergencyEquipmentItem.options.map((item) => [item, EmergencyEquipmentEntry]),
  ) as Record<EmergencyEquipmentItem, typeof EmergencyEquipmentEntry>,
  { error: EMERGENCY_MISSING },
);

/**
 * All six items of `EMERGENCY_EQUIPMENT`. A missing object is parsed as `{}`, so each of the six
 * items gets its own message (AC9); the cast only satisfies the input type, the parse still runs.
 */
export const EmergencyEquipment = EmergencyEquipmentObject.prefault(
  () => ({}) as z.input<typeof EmergencyEquipmentObject>,
);
export type EmergencyEquipment = z.output<typeof EmergencyEquipment>;

/**
 * The cross-field rules (R3, R5). They see the value even when other fields failed, so they
 * check each value's type and never throw; a field that already has its own issue is skipped.
 */
function crossFieldRules(page: unknown, ctx: z.RefinementCtx) {
  if (!isRecord(page)) return;

  if (Array.isArray(page.hazards)) {
    if (page.hazards.length === 0 && page.noSignificantHazards !== true) {
      ctx.addIssue({ code: 'custom', path: ['hazards'], message: HAZARDS_MISSING });
    }
    if (page.hazards.length > 0 && page.noSignificantHazards === true) {
      ctx.addIssue({ code: 'custom', path: ['noSignificantHazards'], message: HAZARDS_BOTH });
    }
  }

  if (Array.isArray(page.protectiveEquipment)) {
    if (page.protectiveEquipment.length === 0 && page.standardLabAttireOnly !== true) {
      ctx.addIssue({ code: 'custom', path: ['protectiveEquipment'], message: PPE_MISSING });
    }
    if (page.protectiveEquipment.length > 0 && page.standardLabAttireOnly === true) {
      ctx.addIssue({ code: 'custom', path: ['standardLabAttireOnly'], message: PPE_BOTH });
    }
  }

  if (page.trainingRequired === true) {
    const trainer = page.trainingGivenBy;
    // A non-string already has its own issue on `trainingGivenBy`.
    if (trainer === null || trainer === undefined || typeof trainer === 'string') {
      const text = (trainer ?? '').trim();
      if (text.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['trainingGivenBy'], message: TRAINER_MISSING });
      } else if (text.length > TRAINER_MAX) {
        ctx.addIssue({
          code: 'custom',
          path: ['trainingGivenBy'],
          message: tooLong('Who gives the training', TRAINER_MAX),
        });
      }
    }
    if (page.hazardLevel === 'LOW') {
      ctx.addIssue({ code: 'custom', path: ['hazardLevel'], message: TRAINING_WITH_LOW });
    }
  }
}

export const SafetyPageContent = z
  .object({
    // Identity
    name: requiredText(120, "Enter the instrument's name", 'Name'),
    photoId: z.uuid({ error: 'Upload a photo' }),
    manufacturer: optionalText(120, 'Manufacturer'),
    model: optionalText(120, 'Model'),
    category: z.enum(Category.options, { error: 'Choose a category' }),
    labRoomId: z.uuid({ error: 'Choose a lab room' }),
    description: requiredText(500, 'Enter a short description', 'Short description'),
    responsibleName: requiredText(
      100,
      "Enter the responsible person's name",
      "Responsible person's name",
    ),
    responsibleContact: requiredText(
      200,
      "Enter the responsible person's email or phone extension",
      "Responsible person's contact",
    ),
    // Risk at a glance
    hazardLevel: z.enum(HazardLevel.options, { error: 'Choose a hazard level' }),
    trainingRequired: z.boolean({ error: 'Choose whether training is required' }),
    trainingGivenBy: z.string({ error: TRAINER_MISSING }).trim().nullish(),
    // Hazards and protection
    hazards: z
      .array(HazardEntry, { error: HAZARDS_MISSING })
      .superRefine(unique('type', 'Each hazard type can be chosen once'), ALWAYS)
      .default([]),
    noSignificantHazards: z.boolean().default(false),
    pictograms: z
      .array(z.enum(HazardPictogram.options, { error: 'Choose a pictogram from the list' }))
      .superRefine(unique(null, 'Each pictogram can be chosen once'), ALWAYS)
      .default([]),
    protectiveEquipment: z
      .array(ProtectiveEquipmentEntry, { error: PPE_MISSING })
      .superRefine(unique('item', 'Each PPE item can be chosen once'), ALWAYS)
      .default([]),
    standardLabAttireOnly: z.boolean().default(false),
    // Guidelines
    beforeUse: requiredText(4000, 'Fill in Before use', 'Before use'),
    safeOperation: requiredText(4000, 'Fill in Safe operation', 'Safe operation'),
    doNot: requiredText(4000, 'Fill in Do NOT', 'Do NOT'),
    emergency: requiredText(4000, 'Fill in Emergency & first aid', 'Emergency & first aid'),
    // Emergency info
    emergencyPhone: requiredText(50, 'Enter the emergency phone number', 'Emergency phone number'),
    emergencyEquipment: EmergencyEquipment,
  })
  // Also runs when other fields failed, so one response names every problem (E03-D2).
  .superRefine(crossFieldRules, ALWAYS)
  .transform(({ trainingGivenBy, ...page }) => ({
    ...page,
    trainingGivenBy: page.trainingRequired ? (trainingGivenBy ?? null) : null,
  }));
export type SafetyPageContent = z.output<typeof SafetyPageContent>;
