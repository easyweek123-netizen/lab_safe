import { describe, expect, it } from 'vitest';
import { ErrorCode, InstrumentSlugParam, PublishedSafetyPage, SafetyPageDisplay } from '../index';

const PHOTO_ID = '0b9a4c1e-5d2f-4f6a-9c3b-7e8d1a2b3c4d';
const ROOM_ID = '6f1e2d3c-4b5a-4968-8776-655443322110';
const AT = '2026-11-25T09:30:00.000Z';

const CONTENT = {
  name: 'Rotary evaporator',
  photoId: PHOTO_ID,
  manufacturer: null,
  model: null,
  category: 'SEPARATION_EVAPORATION',
  labRoomId: ROOM_ID,
  description: 'Removes solvents under reduced pressure.',
  responsibleName: 'Dr. Sara Lab',
  responsibleContact: '1234',
  hazardLevel: 'LOW',
  trainingRequired: false,
  trainingGivenBy: null,
  hazards: [],
  noSignificantHazards: true,
  pictograms: [],
  protectiveEquipment: [],
  standardLabAttireOnly: true,
  beforeUse: 'Check the glassware.',
  safeOperation: 'Rotate first.',
  doNot: 'Do NOT heat a closed system.',
  emergency: 'Stop and vent.',
  emergencyPhone: '112',
  emergencyEquipment: {
    EYEWASH: { kind: 'NOT_APPLICABLE' },
    SAFETY_SHOWER: { kind: 'NOT_APPLICABLE' },
    FIRE_EXTINGUISHER: { kind: 'LOCATION', location: 'By the door' },
    SPILL_KIT: { kind: 'NOT_APPLICABLE' },
    FIRST_AID_KIT: { kind: 'NOT_APPLICABLE' },
    EMERGENCY_STOP: { kind: 'NOT_APPLICABLE' },
  },
};

const LAB_ROOM = { id: ROOM_ID, code: 'LAB-1.02', name: 'Organic chemistry lab' };

describe('SafetyPageDisplay', () => {
  it('S04.1 AC4 parses a never-approved page with lastApproved null', () => {
    const display = { content: CONTENT, labRoom: LAB_ROOM, lastApproved: null };

    expect(SafetyPageDisplay.parse(display)).toEqual(display);
  });

  it('S04.1 AC4 parses an approved page with its approver', () => {
    const display = {
      content: CONTENT,
      labRoom: LAB_ROOM,
      lastApproved: { at: AT, approverName: 'Ada Admin' },
    };

    expect(SafetyPageDisplay.parse(display)).toEqual(display);
  });

  it('S04.1 AC4 refuses a missing labRoom', () => {
    expect(SafetyPageDisplay.safeParse({ content: CONTENT, lastApproved: null }).success).toBe(
      false,
    );
  });

  it('S04.1 AC4 refuses a missing lastApproved, because it is nullable, not optional', () => {
    expect(SafetyPageDisplay.safeParse({ content: CONTENT, labRoom: LAB_ROOM }).success).toBe(
      false,
    );
  });

  it('S04.1 AC4 refuses a bad approval date', () => {
    const display = {
      content: CONTENT,
      labRoom: LAB_ROOM,
      lastApproved: { at: '25 Nov 2026', approverName: 'Ada Admin' },
    };

    expect(SafetyPageDisplay.safeParse(display).success).toBe(false);
  });

  it('S04.1 AC4 refuses content that is not a valid page', () => {
    const display = {
      content: { ...CONTENT, category: 'TOASTER' },
      labRoom: LAB_ROOM,
      lastApproved: null,
    };

    expect(SafetyPageDisplay.safeParse(display).success).toBe(false);
  });
});

describe('InstrumentSlugParam', () => {
  it.each(['rotary-evaporator', 'rotary-evaporator-2', 'Any Text', 'x'.repeat(200)])(
    'S04.2 AC4 parses the slug %j',
    (slug) => {
      expect(InstrumentSlugParam.parse({ slug })).toEqual({ slug });
    },
  );

  it.each(['', 'x'.repeat(201)])('S04.2 AC4 refuses the slug %j', (slug) => {
    expect(InstrumentSlugParam.safeParse({ slug }).success).toBe(false);
  });
});

describe('PublishedSafetyPage', () => {
  const published = {
    slug: 'rotary-evaporator',
    page: {
      content: CONTENT,
      labRoom: LAB_ROOM,
      lastApproved: { at: AT, approverName: 'Ada Admin' },
    },
  };

  it('S04.2 AC4 parses a published page with its last approval', () => {
    expect(PublishedSafetyPage.parse(published)).toEqual(published);
  });

  it('S04.2 AC4 refuses a published page without lastApproved', () => {
    expect(
      PublishedSafetyPage.safeParse({
        ...published,
        page: { ...published.page, lastApproved: null },
      }).success,
    ).toBe(false);
    const pageWithout: Record<string, unknown> = { ...published.page };
    delete pageWithout.lastApproved;
    expect(PublishedSafetyPage.safeParse({ ...published, page: pageWithout }).success).toBe(false);
  });

  it('S04.2 AC4 refuses a missing or empty slug', () => {
    expect(PublishedSafetyPage.safeParse({ page: published.page }).success).toBe(false);
    expect(PublishedSafetyPage.safeParse({ ...published, slug: '' }).success).toBe(false);
  });

  it('S04.2 AC4 has no contributor, email, review note or version', () => {
    expect(Object.keys(PublishedSafetyPage.shape).sort()).toEqual(['page', 'slug']);
    expect(Object.keys(PublishedSafetyPage.shape.page.shape).sort()).toEqual(
      ['content', 'labRoom', 'lastApproved'].sort(),
    );
    const parsed = PublishedSafetyPage.parse({
      ...published,
      submittedBy: { id: ROOM_ID, name: 'Sara Lab', email: 'sara@lab.test' },
      reviewNote: 'Looks good',
      version: 2,
    });
    expect(parsed).toEqual(published);
  });
});

describe('review error codes', () => {
  it('S04.2 AC8 has ALREADY_REVIEWED and S04.2 AC9 has SUBMISSION_CHANGED', () => {
    expect(ErrorCode.parse('ALREADY_REVIEWED')).toBe('ALREADY_REVIEWED');
    expect(ErrorCode.parse('SUBMISSION_CHANGED')).toBe('SUBMISSION_CHANGED');
  });
});
