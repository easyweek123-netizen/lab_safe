import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  Category,
  EMERGENCY_EQUIPMENT,
  EmergencyEquipmentItem,
  ErrorCode,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  HazardPictogram,
  HazardType,
  PHOTO_MAX_BYTES,
  PHOTO_UPLOAD_FIELD,
  PROTECTIVE_EQUIPMENT,
  Photo,
  PhotoIdParam,
  ProtectiveEquipmentItem,
  SafetyPageContent,
} from '../index';

const PHOTO_ID = '0b9a4c1e-5d2f-4f6a-9c3b-7e8d1a2b3c4d';
const ROOM_ID = '6f1e2d3c-4b5a-4968-8776-655443322110';

/** A complete "Rotary evaporator" page, as the form sends it. */
function complete(): Record<string, unknown> {
  return {
    name: 'Rotary evaporator',
    photoId: PHOTO_ID,
    manufacturer: 'Büchi',
    model: 'R-300',
    category: 'SEPARATION_EVAPORATION',
    labRoomId: ROOM_ID,
    description: 'Removes solvents from samples by evaporation under reduced pressure.',
    responsibleName: 'Dr. Sara Lab',
    responsibleContact: 'sara@lab.test',
    hazardLevel: 'MEDIUM',
    trainingRequired: true,
    trainingGivenBy: 'Dr. Sara Lab',
    hazards: [
      { type: 'VACUUM', note: 'The flask can implode under vacuum.' },
      { type: 'HOT_SURFACE', note: 'The water bath reaches 90 °C.' },
    ],
    noSignificantHazards: false,
    pictograms: ['FLAMMABLE'],
    protectiveEquipment: [
      { item: 'SAFETY_GLASSES', note: null },
      { item: 'LAB_COAT', note: 'Buttoned up' },
    ],
    standardLabAttireOnly: false,
    beforeUse: 'Check the glassware for cracks.',
    safeOperation: 'Start the rotation before the vacuum.',
    doNot: 'Do NOT heat a closed system.',
    emergency: 'Stop the heating, vent the system, call the responsible person.',
    emergencyPhone: '112',
    emergencyEquipment: {
      EYEWASH: { kind: 'LOCATION', location: 'Next to the door' },
      SAFETY_SHOWER: { kind: 'LOCATION', location: 'Corridor B' },
      FIRE_EXTINGUISHER: { kind: 'LOCATION', location: 'Next to the fume hood' },
      SPILL_KIT: { kind: 'NOT_APPLICABLE' },
      FIRST_AID_KIT: { kind: 'LOCATION', location: 'Room 1.03' },
      EMERGENCY_STOP: { kind: 'NOT_APPLICABLE' },
    },
  };
}

/** The `path` and message of every issue, in the shape of the API's `fields` entries. */
function fieldsOf(value: unknown) {
  const result = SafetyPageContent.safeParse(value);
  return (result.error?.issues ?? []).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

const EMERGENCY_MISSING = "Give a location or choose 'Not applicable'";

/** Every required field of AC9 with its message, in schema order. */
const REQUIRED_FIELDS = [
  { path: 'name', message: "Enter the instrument's name" },
  { path: 'photoId', message: 'Upload a photo' },
  { path: 'category', message: 'Choose a category' },
  { path: 'labRoomId', message: 'Choose a lab room' },
  { path: 'description', message: 'Enter a short description' },
  { path: 'responsibleName', message: "Enter the responsible person's name" },
  {
    path: 'responsibleContact',
    message: "Enter the responsible person's email or phone extension",
  },
  { path: 'hazardLevel', message: 'Choose a hazard level' },
  { path: 'trainingRequired', message: 'Choose whether training is required' },
  { path: 'beforeUse', message: 'Fill in Before use' },
  { path: 'safeOperation', message: 'Fill in Safe operation' },
  { path: 'doNot', message: 'Fill in Do NOT' },
  { path: 'emergency', message: 'Fill in Emergency & first aid' },
  { path: 'emergencyPhone', message: 'Enter the emergency phone number' },
  ...EMERGENCY_EQUIPMENT.map(({ value }) => ({
    path: `emergencyEquipment.${value}`,
    message: EMERGENCY_MISSING,
  })),
  { path: 'hazards', message: "Choose at least one hazard, or 'No significant hazards'" },
  {
    path: 'protectiveEquipment',
    message: "Choose at least one PPE item, or 'No PPE beyond standard lab attire'",
  },
];

function sorted<T extends { path: string }>(fields: T[]): T[] {
  return [...fields].sort((a, b) => a.path.localeCompare(b.path));
}

describe('list enums', () => {
  it('S03.1 AC13 builds each enum from its list, in PRD order', () => {
    expect(HazardType.options).toEqual(HAZARD_TYPES.map((item) => item.value));
    expect(ProtectiveEquipmentItem.options).toEqual(PROTECTIVE_EQUIPMENT.map((item) => item.value));
    expect(HazardPictogram.options).toEqual(HAZARD_PICTOGRAMS.map((item) => item.value));
    expect(Category.options).toEqual(CATEGORIES.map((item) => item.value));
    expect(EmergencyEquipmentItem.options).toEqual(EMERGENCY_EQUIPMENT.map((item) => item.value));
  });

  it('S03.1 AC9 lists the six emergency items in PRD order with their labels', () => {
    expect(EMERGENCY_EQUIPMENT).toEqual([
      { value: 'EYEWASH', label: 'Eyewash' },
      { value: 'SAFETY_SHOWER', label: 'Safety shower' },
      { value: 'FIRE_EXTINGUISHER', label: 'Fire extinguisher' },
      { value: 'SPILL_KIT', label: 'Spill kit' },
      { value: 'FIRST_AID_KIT', label: 'First-aid kit' },
      { value: 'EMERGENCY_STOP', label: 'Emergency stop' },
    ]);
  });
});

describe('photo contract', () => {
  it('S03.1 AC13 fixes the upload limit, the field name and the photo shape', () => {
    expect(PHOTO_MAX_BYTES).toBe(5_242_880);
    expect(PHOTO_UPLOAD_FIELD).toBe('photo');
    expect(Photo.parse({ id: PHOTO_ID, width: 1600, height: 1200 })).toEqual({
      id: PHOTO_ID,
      width: 1600,
      height: 1200,
    });
    expect(PhotoIdParam.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });

  it.each(['PHOTO_TOO_LARGE', 'PHOTO_TYPE'])('S03.1 AC13 knows the code %s', (code) => {
    expect(ErrorCode.safeParse(code).success).toBe(true);
  });
});

describe('SafetyPageContent: a complete page', () => {
  it('S03.1 AC9 parses a complete page and trims its texts', () => {
    const page = complete();
    const result = SafetyPageContent.parse({ ...page, name: '  Rotary evaporator  ' });

    expect(result).toEqual(page);
  });

  it('S03.1 AC9 turns empty optional texts into null and drops the trainer when no training is required', () => {
    const result = SafetyPageContent.parse({
      ...complete(),
      manufacturer: '   ',
      model: undefined,
      trainingRequired: false,
      trainingGivenBy: 'Dr. Sara Lab',
      protectiveEquipment: [{ item: 'SAFETY_GLASSES', note: '  ' }],
    });

    expect(result.manufacturer).toBeNull();
    expect(result.model).toBeNull();
    expect(result.trainingGivenBy).toBeNull();
    expect(result.protectiveEquipment).toEqual([{ item: 'SAFETY_GLASSES', note: null }]);
  });

  it('S03.1 AC10 accepts "No significant hazards", standard lab attire only and no pictograms', () => {
    const result = SafetyPageContent.safeParse({
      ...complete(),
      hazards: [],
      noSignificantHazards: true,
      protectiveEquipment: [],
      standardLabAttireOnly: true,
      pictograms: [],
    });

    expect(result.success).toBe(true);
  });

  it('S03.1 AC13 accepts every text at its limit', () => {
    const page = complete();
    const result = SafetyPageContent.safeParse({
      ...page,
      name: 'n'.repeat(120),
      manufacturer: 'm'.repeat(120),
      model: 'm'.repeat(120),
      description: 'd'.repeat(500),
      responsibleName: 'r'.repeat(100),
      responsibleContact: 'c'.repeat(200),
      trainingGivenBy: 't'.repeat(200),
      hazards: [{ type: 'VACUUM', note: 'h'.repeat(300) }],
      protectiveEquipment: [{ item: 'LAB_COAT', note: 'p'.repeat(200) }],
      beforeUse: 'b'.repeat(4000),
      safeOperation: 's'.repeat(4000),
      doNot: 'd'.repeat(4000),
      emergency: 'e'.repeat(4000),
      emergencyPhone: '1'.repeat(50),
      emergencyEquipment: {
        ...(page.emergencyEquipment as object),
        EYEWASH: { kind: 'LOCATION', location: 'l'.repeat(200) },
      },
    });

    expect(result.success).toBe(true);
  });
});

describe('SafetyPageContent: missing fields (AC9)', () => {
  it('S03.1 AC9 names every required field at once for an empty body', () => {
    expect(sorted(fieldsOf({}))).toEqual(sorted(REQUIRED_FIELDS));
  });

  it('S03.1 AC9 counts texts of only spaces as missing', () => {
    const page = complete();
    const spaces = '   ';
    const fields = fieldsOf({
      ...page,
      name: spaces,
      description: spaces,
      responsibleName: spaces,
      responsibleContact: spaces,
      beforeUse: spaces,
      safeOperation: spaces,
      doNot: spaces,
      emergency: spaces,
      emergencyPhone: spaces,
      hazards: [{ type: 'VACUUM', note: spaces }],
      emergencyEquipment: {
        ...(page.emergencyEquipment as object),
        EYEWASH: { kind: 'LOCATION', location: spaces },
      },
      trainingGivenBy: spaces,
    });

    expect(sorted(fields)).toEqual(
      sorted([
        { path: 'name', message: "Enter the instrument's name" },
        { path: 'description', message: 'Enter a short description' },
        { path: 'responsibleName', message: "Enter the responsible person's name" },
        {
          path: 'responsibleContact',
          message: "Enter the responsible person's email or phone extension",
        },
        { path: 'beforeUse', message: 'Fill in Before use' },
        { path: 'safeOperation', message: 'Fill in Safe operation' },
        { path: 'doNot', message: 'Fill in Do NOT' },
        { path: 'emergency', message: 'Fill in Emergency & first aid' },
        { path: 'emergencyPhone', message: 'Enter the emergency phone number' },
        { path: 'hazards.0.note', message: 'Describe how this hazard arises' },
        { path: 'emergencyEquipment.EYEWASH', message: EMERGENCY_MISSING },
        { path: 'trainingGivenBy', message: 'Enter who gives the training' },
      ]),
    );
  });

  it('S03.1 AC9 refuses null and wrongly typed values without throwing', () => {
    const fields = fieldsOf({
      ...complete(),
      name: null,
      photoId: 42,
      hazards: 'VACUUM',
      protectiveEquipment: null,
      emergencyEquipment: 'none',
      trainingRequired: 'yes',
    });

    expect(fields.map((field) => field.path).sort()).toEqual(
      [
        'emergencyEquipment',
        'hazards',
        'name',
        'photoId',
        'protectiveEquipment',
        'trainingRequired',
      ].sort(),
    );
  });
});

describe('SafetyPageContent: cross-field gaps (AC10)', () => {
  it.each([
    [
      'no hazard type and no "No significant hazards"',
      { hazards: [], noSignificantHazards: false },
      [{ path: 'hazards', message: "Choose at least one hazard, or 'No significant hazards'" }],
    ],
    [
      'a hazard type without its note',
      { hazards: [{ type: 'VACUUM', note: 'Implosion' }, { type: 'FIRE' }] },
      [{ path: 'hazards.1.note', message: 'Describe how this hazard arises' }],
    ],
    [
      'no PPE item and no "No PPE beyond standard lab attire"',
      { protectiveEquipment: [], standardLabAttireOnly: false },
      [
        {
          path: 'protectiveEquipment',
          message: "Choose at least one PPE item, or 'No PPE beyond standard lab attire'",
        },
      ],
    ],
    [
      'training required without who gives it',
      { trainingRequired: true, trainingGivenBy: null },
      [{ path: 'trainingGivenBy', message: 'Enter who gives the training' }],
    ],
  ])('S03.1 AC10 names exactly the gap: %s', (_label, change, expected) => {
    expect(fieldsOf({ ...complete(), ...change })).toEqual(expected);
  });

  it.each([
    ['missing', undefined],
    ['a location without text', { kind: 'LOCATION' }],
    ['an unknown kind', { kind: 'SOMEWHERE' }],
  ])('S03.1 AC10 names an emergency item that is %s', (_label, entry) => {
    const page = complete();
    const fields = fieldsOf({
      ...page,
      emergencyEquipment: { ...(page.emergencyEquipment as object), SPILL_KIT: entry },
    });

    expect(fields).toEqual([{ path: 'emergencyEquipment.SPILL_KIT', message: EMERGENCY_MISSING }]);
  });

  it('S03.1 AC10 reports the cross-field gaps together with every other missing field', () => {
    const fields = fieldsOf({
      trainingRequired: true,
      hazards: [{ type: 'VACUUM' }],
      emergencyEquipment: { EYEWASH: { kind: 'NOT_APPLICABLE' } },
    });

    const expected = REQUIRED_FIELDS.filter(
      (field) =>
        !['trainingRequired', 'hazards', 'emergencyEquipment.EYEWASH'].includes(field.path),
    ).concat([
      { path: 'hazards.0.note', message: 'Describe how this hazard arises' },
      { path: 'trainingGivenBy', message: 'Enter who gives the training' },
    ]);
    expect(sorted(fields)).toEqual(sorted(expected));
  });
});

describe('SafetyPageContent: contradictions (AC11, AC12)', () => {
  it('S03.1 AC11 refuses hazard types together with "No significant hazards"', () => {
    expect(fieldsOf({ ...complete(), noSignificantHazards: true })).toEqual([
      {
        path: 'noSignificantHazards',
        message: "Choose hazards or 'No significant hazards', not both.",
      },
    ]);
  });

  it('S03.1 AC11 refuses PPE items together with "No PPE beyond standard lab attire"', () => {
    expect(fieldsOf({ ...complete(), standardLabAttireOnly: true })).toEqual([
      {
        path: 'standardLabAttireOnly',
        message: "Choose PPE items or 'No PPE beyond standard lab attire', not both.",
      },
    ]);
  });

  it('S03.1 AC11 reports both contradictions together with a missing field', () => {
    const fields = fieldsOf({
      ...complete(),
      name: '',
      noSignificantHazards: true,
      standardLabAttireOnly: true,
    });

    expect(fields.map((field) => field.path).sort()).toEqual(
      ['name', 'noSignificantHazards', 'standardLabAttireOnly'].sort(),
    );
  });

  it('S03.1 AC12 refuses training required with hazard level Low on hazardLevel', () => {
    expect(fieldsOf({ ...complete(), hazardLevel: 'LOW' })).toEqual([
      {
        path: 'hazardLevel',
        message: "A page that requires training can't have a Low hazard level.",
      },
    ]);
  });

  it('S03.1 AC12 refuses training with Low also when other fields fail', () => {
    const fields = fieldsOf({ trainingRequired: true, hazardLevel: 'LOW' });

    expect(fields).toContainEqual({
      path: 'hazardLevel',
      message: "A page that requires training can't have a Low hazard level.",
    });
  });

  it('S03.1 AC12 accepts hazard level Low without training', () => {
    const result = SafetyPageContent.safeParse({
      ...complete(),
      hazardLevel: 'LOW',
      trainingRequired: false,
    });

    expect(result.success).toBe(true);
  });
});

describe('SafetyPageContent: values outside the lists, duplicates and limits (AC13)', () => {
  it.each([
    ['a category', { category: 'KITCHEN' }, 'category'],
    ['a hazard level', { hazardLevel: 'EXTREME' }, 'hazardLevel'],
    ['a hazard type', { hazards: [{ type: 'BOREDOM', note: 'Long runs' }] }, 'hazards.0.type'],
    [
      'a PPE item',
      { protectiveEquipment: [{ item: 'CAPE', note: null }] },
      'protectiveEquipment.0.item',
    ],
    ['a GHS pictogram', { pictograms: ['FLAMMABLE', 'SMILEY'] }, 'pictograms.1'],
    ['a lab room id', { labRoomId: 'room-1' }, 'labRoomId'],
    ['a photo id', { photoId: 'photo.jpg' }, 'photoId'],
  ])('S03.1 AC13 refuses %s outside the list', (_label, change, path) => {
    expect(fieldsOf({ ...complete(), ...change }).map((field) => field.path)).toEqual([path]);
  });

  it.each([
    [
      'a hazard type',
      {
        hazards: [
          { type: 'VACUUM', note: 'Implosion' },
          { type: 'VACUUM', note: 'Again' },
        ],
      },
      { path: 'hazards', message: 'Each hazard type can be chosen once' },
    ],
    [
      'a GHS pictogram',
      { pictograms: ['FLAMMABLE', 'TOXIC', 'FLAMMABLE'] },
      { path: 'pictograms', message: 'Each pictogram can be chosen once' },
    ],
    [
      'a PPE item',
      {
        protectiveEquipment: [
          { item: 'LAB_COAT', note: null },
          { item: 'LAB_COAT', note: 'Twice' },
        ],
      },
      { path: 'protectiveEquipment', message: 'Each PPE item can be chosen once' },
    ],
  ])('S03.1 AC13 refuses %s listed twice', (_label, change, expected) => {
    expect(fieldsOf({ ...complete(), ...change })).toEqual([expected]);
  });

  it.each([
    ['name', 120, 'Name must be at most 120 characters'],
    ['manufacturer', 120, 'Manufacturer must be at most 120 characters'],
    ['model', 120, 'Model must be at most 120 characters'],
    ['description', 500, 'Short description must be at most 500 characters'],
    ['responsibleName', 100, "Responsible person's name must be at most 100 characters"],
    ['responsibleContact', 200, "Responsible person's contact must be at most 200 characters"],
    ['trainingGivenBy', 200, 'Who gives the training must be at most 200 characters'],
    ['beforeUse', 4000, 'Before use must be at most 4000 characters'],
    ['safeOperation', 4000, 'Safe operation must be at most 4000 characters'],
    ['doNot', 4000, 'Do NOT must be at most 4000 characters'],
    ['emergency', 4000, 'Emergency & first aid must be at most 4000 characters'],
    ['emergencyPhone', 50, 'Emergency phone number must be at most 50 characters'],
  ])('S03.1 AC13 refuses %s longer than %i characters', (field, limit, message) => {
    expect(fieldsOf({ ...complete(), [field]: 'x'.repeat(limit + 1) })).toEqual([
      { path: field, message },
    ]);
  });

  it('S03.1 AC13 refuses notes and locations longer than their limits', () => {
    const page = complete();
    const fields = fieldsOf({
      ...page,
      hazards: [{ type: 'VACUUM', note: 'h'.repeat(301) }],
      protectiveEquipment: [{ item: 'LAB_COAT', note: 'p'.repeat(201) }],
      emergencyEquipment: {
        ...(page.emergencyEquipment as object),
        EYEWASH: { kind: 'LOCATION', location: 'l'.repeat(201) },
      },
    });

    expect(fields).toEqual([
      { path: 'hazards.0.note', message: 'Hazard note must be at most 300 characters' },
      { path: 'protectiveEquipment.0.note', message: 'PPE note must be at most 200 characters' },
      { path: 'emergencyEquipment.EYEWASH', message: 'Location must be at most 200 characters' },
    ]);
  });

  it('S03.1 AC13 counts the limit after trimming', () => {
    expect(fieldsOf({ ...complete(), name: `  ${'n'.repeat(120)}  ` })).toEqual([]);
  });
});
