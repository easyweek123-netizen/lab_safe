import { describe, expect, it } from 'vitest';
import {
  ApproveSubmissionRequest,
  RejectSubmissionRequest,
  ReviewDecision,
  ReviewQueue,
  ReviewQueueItem,
  ReviewSubmission,
} from '../index';

const ID = '0b9a4c1e-5d2f-4f6a-9c3b-7e8d1a2b3c4d';
const USER_ID = '6f1e2d3c-4b5a-4968-8776-655443322110';
const ROOM_ID = '3a2b1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d';
const AT = '2026-11-25T09:30:00.000Z';

const CONTENT = {
  name: 'Rotary evaporator',
  photoId: ID,
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

const ITEM = {
  id: ID,
  name: 'Rotary evaporator',
  kind: 'NEW',
  submittedBy: { id: USER_ID, name: 'Sara Lab' },
  submittedAt: AT,
};

function submission(): Record<string, unknown> {
  return {
    id: ID,
    kind: 'NEW',
    status: 'PENDING',
    submittedAt: AT,
    submittedBy: { id: USER_ID, name: 'Sara Lab' },
    version: 1,
    page: {
      content: CONTENT,
      labRoom: { id: ROOM_ID, code: 'LAB-1.02', name: 'Organic chemistry lab' },
      lastApproved: null,
    },
  };
}

describe('ReviewQueue', () => {
  it('S04.1 AC1 parses a queue of items and an empty queue', () => {
    expect(ReviewQueueItem.parse(ITEM)).toEqual(ITEM);
    expect(ReviewQueue.parse({ items: [ITEM] })).toEqual({ items: [ITEM] });
    expect(ReviewQueue.parse({ items: [] })).toEqual({ items: [] });
  });

  it('S04.1 AC1 keeps no content and no email in an item', () => {
    const parsed = ReviewQueueItem.parse({
      ...ITEM,
      content: CONTENT,
      submittedBy: { ...ITEM.submittedBy, email: 'sara@lab.test' },
    });

    expect(parsed).toEqual(ITEM);
    expect(Object.keys(ReviewQueueItem.shape).sort()).toEqual(
      ['id', 'kind', 'name', 'submittedAt', 'submittedBy'].sort(),
    );
  });

  it('S04.1 AC1 refuses a bad date and an unknown kind', () => {
    expect(ReviewQueueItem.safeParse({ ...ITEM, submittedAt: '25 Nov 2026' }).success).toBe(false);
    expect(ReviewQueueItem.safeParse({ ...ITEM, kind: 'COPY' }).success).toBe(false);
    expect(ReviewQueueItem.safeParse({ ...ITEM, id: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('ReviewSubmission', () => {
  it('S04.1 AC4 parses a pending page with lastApproved null', () => {
    const value = submission();

    expect(ReviewSubmission.parse(value)).toEqual(value);
  });

  it('S04.1 AC4 refuses a page without its labRoom', () => {
    const value = submission();
    const page = { ...(value.page as Record<string, unknown>) };
    delete page.labRoom;

    expect(ReviewSubmission.safeParse({ ...value, page }).success).toBe(false);
  });

  it('S04.1 AC4 refuses a bad date and an unknown status', () => {
    expect(ReviewSubmission.safeParse({ ...submission(), submittedAt: 'yesterday' }).success).toBe(
      false,
    );
    expect(ReviewSubmission.safeParse({ ...submission(), status: 'DRAFT' }).success).toBe(false);
  });

  it('S04.1 AC4 keeps no email of the submitter', () => {
    const value = submission();
    const parsed = ReviewSubmission.parse({
      ...value,
      submittedBy: { id: USER_ID, name: 'Sara Lab', email: 'sara@lab.test' },
    });

    expect(parsed.submittedBy).toEqual({ id: USER_ID, name: 'Sara Lab' });
  });
});

describe('ReviewSubmission version', () => {
  it('S04.2 AC9 parses the version the admin saw', () => {
    const value = { ...submission(), version: 3 };

    expect(ReviewSubmission.parse(value)).toEqual(value);
  });

  it.each([0, 1.5, '1'])('S04.2 AC9 refuses the version %j', (version) => {
    expect(ReviewSubmission.safeParse({ ...submission(), version }).success).toBe(false);
  });

  it('S04.2 AC9 refuses a preview without its version', () => {
    const value = submission();
    delete value.version;

    expect(ReviewSubmission.safeParse(value).success).toBe(false);
  });
});

describe('ApproveSubmissionRequest', () => {
  it('S04.2 AC9 parses a whole version of at least 1', () => {
    expect(ApproveSubmissionRequest.parse({ version: 1 })).toEqual({ version: 1 });
    expect(ApproveSubmissionRequest.parse({ version: 7 })).toEqual({ version: 7 });
  });

  it.each([0, -1, 1.5, '1', null])('S04.2 AC9 refuses the version %j', (version) => {
    expect(ApproveSubmissionRequest.safeParse({ version }).success).toBe(false);
  });

  it('S04.2 AC9 refuses a body without a version', () => {
    expect(ApproveSubmissionRequest.safeParse({}).success).toBe(false);
  });
});

describe('ReviewDecision', () => {
  it('S04.2 AC1 parses an approval with its slug', () => {
    const decision = { id: ID, status: 'APPROVED', slug: 'rotary-evaporator' };

    expect(ReviewDecision.parse(decision)).toEqual(decision);
  });

  it('S04.2 AC1 parses a rejection with slug null', () => {
    const decision = { id: ID, status: 'REJECTED', slug: null };

    expect(ReviewDecision.parse(decision)).toEqual(decision);
  });

  it('S04.2 AC1 refuses PENDING, a missing slug and a bad id', () => {
    expect(ReviewDecision.safeParse({ id: ID, status: 'PENDING', slug: null }).success).toBe(false);
    expect(ReviewDecision.safeParse({ id: ID, status: 'APPROVED' }).success).toBe(false);
    expect(
      ReviewDecision.safeParse({ id: 'not-a-uuid', status: 'APPROVED', slug: 'a' }).success,
    ).toBe(false);
  });
});

describe('RejectSubmissionRequest', () => {
  const MISSING = 'Enter a note for the contributor';
  const TOO_LONG = 'The note must be at most 1000 characters';

  function messages(body: unknown): string[] {
    const result = RejectSubmissionRequest.safeParse(body);
    if (result.success) {
      return [];
    }
    return result.error.issues.map((issue) => issue.message);
  }

  function paths(body: unknown): string[] {
    const result = RejectSubmissionRequest.safeParse(body);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
  }

  it('S04.3 AC1 parses a note and trims it, keeping inner line breaks', () => {
    expect(
      RejectSubmissionRequest.parse({
        note: '  The photo is blurry;\nadd the waste step to Safe operation.  ',
      }),
    ).toEqual({ note: 'The photo is blurry;\nadd the waste step to Safe operation.' });
  });

  it.each([
    ['no note', {}],
    ['an empty note', { note: '' }],
    ['a note of only spaces', { note: '   ' }],
    ['a note of only line breaks and tabs', { note: '\n\t \n' }],
    ['a null note', { note: null }],
  ])('S04.3 AC2 refuses %s with "Enter a note for the contributor"', (_what, body) => {
    expect(messages(body)).toEqual([MISSING]);
    expect(paths(body)).toEqual(['note']);
  });

  it('S04.3 AC2 accepts 1000 characters and refuses 1001 with "The note must be at most 1000 characters"', () => {
    expect(RejectSubmissionRequest.safeParse({ note: 'a'.repeat(1000) }).success).toBe(true);
    expect(RejectSubmissionRequest.safeParse({ note: ` ${'a'.repeat(1000)} ` }).success).toBe(true);
    expect(messages({ note: 'a'.repeat(1001) })).toEqual([TOO_LONG]);
    expect(paths({ note: 'a'.repeat(1001) })).toEqual(['note']);
  });
});
