import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  ErrorResponse,
  HAZARD_LEVELS,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  HazardLevel,
  HealthResponse,
  PROTECTIVE_EQUIPMENT,
} from './index';

// A literal copy of PRD §4.2 (and the hazard levels of PRD §4.1), word for word.
const PRD_LABELS = {
  hazardTypes: [
    'Electrical',
    'Hot surface / heat',
    'Cryogenic / extreme cold',
    'High pressure / compressed gas',
    'Vacuum / implosion',
    'Fire / flammable vapour',
    'Chemical exposure (toxic, corrosive, irritant)',
    'UV radiation',
    'Laser',
    'Ionizing radiation (X-ray)',
    'Strong magnetic field',
    'Moving or rotating parts',
    'Glass breakage / sharps',
    'Noise',
    'Biological',
  ],
  protectiveEquipment: [
    'Safety glasses',
    'Splash goggles',
    'Face shield',
    'Lab coat',
    'Flame-resistant lab coat',
    'Chemical-resistant gloves',
    'Heat-resistant gloves',
    'Cryogenic gloves',
    'Cut-resistant gloves',
    'Laser safety eyewear',
    'UV-protective eyewear',
    'Hearing protection',
    'Respirator',
    'Closed-toe shoes',
  ],
  hazardPictograms: [
    'Explosive',
    'Flammable',
    'Oxidizing',
    'Compressed gas',
    'Corrosive',
    'Toxic (skull)',
    'Harmful/irritant (exclamation mark)',
    'Health hazard',
    'Environmental hazard',
  ],
  categories: [
    'Heating & thermal',
    'Separation & evaporation',
    'Analytical & spectroscopy',
    'Pressure & vacuum',
    'Cooling & cryogenic',
    'Mixing & centrifugation',
    'Ventilation & containment',
    'Other',
  ],
  hazardLevels: ['Low', 'Medium', 'High'],
};

const LISTS = [
  { name: 'HAZARD_TYPES', list: HAZARD_TYPES, count: 15, labels: PRD_LABELS.hazardTypes },
  {
    name: 'PROTECTIVE_EQUIPMENT',
    list: PROTECTIVE_EQUIPMENT,
    count: 14,
    labels: PRD_LABELS.protectiveEquipment,
  },
  {
    name: 'HAZARD_PICTOGRAMS',
    list: HAZARD_PICTOGRAMS,
    count: 9,
    labels: PRD_LABELS.hazardPictograms,
  },
  { name: 'CATEGORIES', list: CATEGORIES, count: 8, labels: PRD_LABELS.categories },
  { name: 'HAZARD_LEVELS', list: HAZARD_LEVELS, count: 3, labels: PRD_LABELS.hazardLevels },
];

describe('fixed lists', () => {
  it.each(LISTS)(
    'TC-2.1 $name has the PRD count and labels, in PRD order',
    ({ list, count, labels }) => {
      expect(list).toHaveLength(count);
      expect(list.map((item) => item.label)).toEqual(labels);
    },
  );

  it.each(LISTS)('TC-2.1 $name values are unique upper-case codes', ({ list }) => {
    const values = list.map((item) => item.value);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) expect(value).toMatch(/^[A-Z][A-Z0-9_]*$/);
  });

  it('TC-2.1 HazardLevel accepts exactly the HAZARD_LEVELS values', () => {
    expect(HazardLevel.options).toEqual(HAZARD_LEVELS.map((item) => item.value));
    expect(HazardLevel.safeParse('LOW').success).toBe(true);
    expect(HazardLevel.safeParse('low').success).toBe(false);
  });
});

describe('contract schemas', () => {
  it('TC-2.2 HealthResponse accepts ok/ok and rejects a down status', () => {
    expect(HealthResponse.safeParse({ status: 'ok', database: 'ok' }).success).toBe(true);
    expect(HealthResponse.safeParse({ status: 'down' }).success).toBe(false);
  });

  it('TC-2.2 ErrorResponse accepts a body with and without fields', () => {
    expect(
      ErrorResponse.safeParse({ statusCode: 404, code: 'NOT_FOUND', message: 'Not found.' })
        .success,
    ).toBe(true);
    expect(
      ErrorResponse.safeParse({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed.',
        fields: [{ path: 'hazards', message: 'Required' }],
      }).success,
    ).toBe(true);
  });

  it('TC-2.2 ErrorResponse rejects an unknown code', () => {
    expect(
      ErrorResponse.safeParse({ statusCode: 418, code: 'TEAPOT', message: 'No.' }).success,
    ).toBe(false);
  });
});
