import {
  EMERGENCY_EQUIPMENT,
  HAZARD_TYPES,
  PROTECTIVE_EQUIPMENT,
  SafetyPageContent,
} from '@labsafe/shared';
import { describe, expect, it } from 'vitest';
import { fieldLabel, fieldTarget, isFieldPath, summaryItems } from './field-labels';
import { emptyFormValues, fieldId, toContent, type SafetyPageFormValues } from './form-values';

/** Every hazard type and PPE item ticked, each with an empty or too long note. */
const everyItemTicked: SafetyPageFormValues = {
  ...emptyFormValues,
  name: 'x'.repeat(121),
  manufacturer: 'x'.repeat(121),
  model: 'x'.repeat(121),
  description: 'x'.repeat(501),
  responsibleName: 'x'.repeat(101),
  responsibleContact: 'x'.repeat(201),
  hazardLevel: 'LOW',
  trainingRequired: 'yes',
  trainingGivenBy: 'x'.repeat(201),
  hazards: HAZARD_TYPES.map((hazard) => ({ type: hazard.value, note: '' })),
  noSignificantHazards: true,
  protectiveEquipment: PROTECTIVE_EQUIPMENT.map((ppe) => ({
    item: ppe.value,
    note: 'x'.repeat(201),
  })),
  standardLabAttireOnly: true,
  beforeUse: 'x'.repeat(4001),
  safeOperation: 'x'.repeat(4001),
  doNot: 'x'.repeat(4001),
  emergency: 'x'.repeat(4001),
  emergencyPhone: 'x'.repeat(51),
  emergencyEquipment: Object.fromEntries(
    EMERGENCY_EQUIPMENT.map((item) => [
      item.value,
      { location: 'x'.repeat(201), notApplicable: false },
    ]),
  ) as SafetyPageFormValues['emergencyEquipment'],
};

/** Bodies the server may be sent directly: values outside the lists, duplicates, wrong types. */
const outsideTheForm: unknown[] = [
  {},
  {
    photoId: 'not-a-uuid',
    category: 'NOPE',
    labRoomId: 'nope',
    hazardLevel: 'NOPE',
    trainingRequired: 'maybe',
    trainingGivenBy: 5,
    hazards: [{ type: 'NOPE', note: 'x' }, { type: 'NOPE', note: 'x' }, 'x'],
    noSignificantHazards: 'x',
    pictograms: ['NOPE', 'FLAMMABLE', 'FLAMMABLE'],
    protectiveEquipment: [{ item: 'NOPE' }, { item: 'LAB_COAT', note: 3 }],
    standardLabAttireOnly: 'x',
    emergencyEquipment: 'x',
  },
  { hazards: 'x', pictograms: 'x', protectiveEquipment: 'x', emergencyEquipment: { EYEWASH: 'x' } },
];

function issuePaths(input: unknown): string[] {
  const result = SafetyPageContent.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('field-labels', () => {
  it('S03.1 AC9 names every issue path the shared schema can produce', () => {
    const paths = [
      ...issuePaths(toContent(emptyFormValues)),
      ...issuePaths(toContent(everyItemTicked)),
      ...outsideTheForm.flatMap(issuePaths),
    ];
    expect(paths.length).toBeGreaterThan(60);
    for (const path of paths) {
      expect(isFieldPath(path), path).toBe(true);
      expect(fieldLabel(path, everyItemTicked), path).toEqual(expect.any(String));
    }
  });

  it('S03.1 AC10 names an indexed note after its hazard type or PPE item', () => {
    const vacuum = everyItemTicked.hazards.findIndex((hazard) => hazard.type === 'VACUUM');
    const coat = everyItemTicked.protectiveEquipment.findIndex((ppe) => ppe.item === 'LAB_COAT');

    expect(fieldLabel(`hazards.${vacuum}.note`, everyItemTicked)).toBe(
      'How does the Vacuum / implosion hazard arise?',
    );
    expect(fieldLabel(`protectiveEquipment.${coat}.note`, everyItemTicked)).toBe(
      'Note for Lab coat',
    );
    expect(fieldLabel('emergencyEquipment.SPILL_KIT', everyItemTicked)).toBe('Spill kit');
    expect(fieldLabel('hazards.0.type', everyItemTicked)).toBe('Hazards');
    expect(fieldLabel('pictograms.1', everyItemTicked)).toBe('GHS pictograms');
    expect(fieldLabel('unknownField', everyItemTicked)).toBeUndefined();
  });

  it('S03.1 AC9 links each path to the input that holds it', () => {
    expect(fieldTarget('name')).toBe(fieldId('name'));
    expect(fieldTarget('hazards.2.note')).toBe('page-hazards-2-note');
    expect(fieldTarget('hazards.2.type')).toBe('page-hazards');
    expect(fieldTarget('pictograms.1')).toBe('page-pictograms');
    expect(fieldTarget('protectiveEquipment.0.note')).toBe('page-protectiveEquipment-0-note');
    expect(fieldTarget('protectiveEquipment.0.item')).toBe('page-protectiveEquipment');
    expect(fieldTarget('emergencyEquipment.EYEWASH')).toBe('page-emergencyEquipment-EYEWASH');
  });

  it('S03.1 AC9 lists nested errors in the order of the form', () => {
    const errors = {
      emergencyEquipment: {
        SPILL_KIT: { type: 'custom', message: 'Spill' },
        EYEWASH: { type: 'custom', message: 'Eye' },
      },
      hazards: [undefined, { note: { type: 'custom', message: 'Note 1' } }],
      name: { type: 'custom', message: 'Name missing', ref: { name: 'name' } },
    };
    const values = {
      hazards: [
        { type: 'ELECTRICAL' as const, note: 'x' },
        { type: 'VACUUM' as const, note: '' },
      ],
      protectiveEquipment: [],
    };

    expect(summaryItems(errors, values)).toEqual([
      { path: 'name', label: 'Name', message: 'Name missing', target: 'page-name' },
      {
        path: 'hazards.1.note',
        label: 'How does the Vacuum / implosion hazard arise?',
        message: 'Note 1',
        target: 'page-hazards-1-note',
      },
      {
        path: 'emergencyEquipment.EYEWASH',
        label: 'Eyewash',
        message: 'Eye',
        target: 'page-emergencyEquipment-EYEWASH',
      },
      {
        path: 'emergencyEquipment.SPILL_KIT',
        label: 'Spill kit',
        message: 'Spill',
        target: 'page-emergencyEquipment-SPILL_KIT',
      },
    ]);
  });
});
