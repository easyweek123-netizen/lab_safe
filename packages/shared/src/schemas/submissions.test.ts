import { describe, expect, it } from 'vitest';
import {
  MySubmissions,
  REVISION_KINDS,
  REVISION_STATUSES,
  RevisionKind,
  RevisionStatus,
  Submission,
  SubmissionIdParam,
  SubmissionSummary,
} from '../index';

const ID = '0b9a4c1e-5d2f-4f6a-9c3b-7e8d1a2b3c4d';
const USER_ID = '6f1e2d3c-4b5a-4968-8776-655443322110';
const AT = '2026-11-24T09:30:00.000Z';

const CONTENT = {
  name: 'Rotary evaporator',
  photoId: ID,
  manufacturer: null,
  model: null,
  category: 'SEPARATION_EVAPORATION',
  labRoomId: USER_ID,
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

describe('revision kinds and statuses', () => {
  it('S03.1 AC13 lists the fixed kinds and statuses', () => {
    expect(REVISION_KINDS).toEqual(['NEW', 'UPDATE']);
    expect(REVISION_STATUSES).toEqual(['PENDING', 'APPROVED', 'REJECTED']);
    expect(RevisionKind.options).toEqual([...REVISION_KINDS]);
    expect(RevisionStatus.options).toEqual([...REVISION_STATUSES]);
  });
});

describe('Submission', () => {
  it('S03.1 AC13 parses a stored page with the same content schema', () => {
    const submission = {
      id: ID,
      kind: 'NEW',
      status: 'PENDING',
      submittedAt: AT,
      updatedAt: AT,
      submittedBy: { id: USER_ID, name: 'Sara Lab' },
      content: CONTENT,
      slug: null,
      reviewNote: null,
    };

    expect(Submission.parse(submission)).toEqual(submission);
  });

  it('S03.1 AC13 refuses a kind or status outside the lists', () => {
    const base = {
      id: ID,
      submittedAt: AT,
      updatedAt: AT,
      submittedBy: { id: USER_ID, name: 'Sara Lab' },
      content: CONTENT,
      slug: null,
      reviewNote: null,
    };

    expect(Submission.safeParse({ ...base, kind: 'COPY', status: 'PENDING' }).success).toBe(false);
    expect(Submission.safeParse({ ...base, kind: 'NEW', status: 'DRAFT' }).success).toBe(false);
  });
});

describe('MySubmissions', () => {
  it('S03.1 AC13 parses a list of summaries', () => {
    const summary = {
      id: ID,
      name: 'Rotary evaporator',
      status: 'PENDING',
      submittedAt: AT,
      slug: null,
      reviewNote: null,
    };

    expect(SubmissionSummary.parse(summary)).toEqual(summary);
    expect(MySubmissions.parse({ submissions: [summary] })).toEqual({ submissions: [summary] });
    expect(MySubmissions.parse({ submissions: [] })).toEqual({ submissions: [] });
  });
});

describe('SubmissionIdParam', () => {
  it('S03.2 AC4 parses a uuid id', () => {
    expect(SubmissionIdParam.parse({ id: ID })).toEqual({ id: ID });
  });

  it.each(['not-a-uuid', '123', ''])('S03.2 AC4 refuses the malformed id %j', (id) => {
    expect(SubmissionIdParam.safeParse({ id }).success).toBe(false);
  });
});

describe('slug of an approved page', () => {
  const submission = {
    id: ID,
    kind: 'NEW',
    status: 'APPROVED',
    submittedAt: AT,
    updatedAt: AT,
    submittedBy: { id: USER_ID, name: 'Sara Lab' },
    content: CONTENT,
    slug: 'rotary-evaporator',
    reviewNote: null,
  };
  const summary = {
    id: ID,
    name: 'Rotary evaporator',
    status: 'APPROVED',
    submittedAt: AT,
    slug: 'rotary-evaporator',
    reviewNote: null,
  };

  it('S04.2 AC10 parses an approved submission and summary with their slug', () => {
    expect(Submission.parse(submission)).toEqual(submission);
    expect(SubmissionSummary.parse(summary)).toEqual(summary);
    expect(MySubmissions.parse({ submissions: [summary] })).toEqual({ submissions: [summary] });
  });

  it('S04.2 AC10 refuses a missing slug, because it is nullable, not optional', () => {
    const withoutSlug: Record<string, unknown> = { ...submission };
    const summaryWithoutSlug: Record<string, unknown> = { ...summary };
    delete withoutSlug.slug;
    delete summaryWithoutSlug.slug;

    expect(Submission.safeParse(withoutSlug).success).toBe(false);
    expect(SubmissionSummary.safeParse(summaryWithoutSlug).success).toBe(false);
  });

  it('S04.2 AC10 refuses a slug that is not a string', () => {
    expect(Submission.safeParse({ ...submission, slug: 42 }).success).toBe(false);
    expect(SubmissionSummary.safeParse({ ...summary, slug: '' }).success).toBe(false);
  });
});

describe('reviewNote of a rejected page', () => {
  const NOTE = 'The photo is blurry;\nadd the waste step to Safe operation.';
  const submission = {
    id: ID,
    kind: 'NEW',
    status: 'REJECTED',
    submittedAt: AT,
    updatedAt: AT,
    submittedBy: { id: USER_ID, name: 'Sara Lab' },
    content: CONTENT,
    slug: null,
    reviewNote: NOTE,
  };
  const summary = {
    id: ID,
    name: 'Rotary evaporator',
    status: 'REJECTED',
    submittedAt: AT,
    slug: null,
    reviewNote: NOTE,
  };

  it('S04.3 AC4 parses a rejected submission and summary with the note word for word', () => {
    expect(Submission.parse(submission)).toEqual(submission);
    expect(SubmissionSummary.parse(summary)).toEqual(summary);
    expect(MySubmissions.parse({ submissions: [summary] })).toEqual({ submissions: [summary] });
  });

  it('S04.3 AC4 refuses a missing reviewNote, because it is nullable, not optional', () => {
    const withoutNote: Record<string, unknown> = { ...submission };
    const summaryWithoutNote: Record<string, unknown> = { ...summary };
    delete withoutNote.reviewNote;
    delete summaryWithoutNote.reviewNote;

    expect(Submission.safeParse(withoutNote).success).toBe(false);
    expect(SubmissionSummary.safeParse(summaryWithoutNote).success).toBe(false);
  });

  it('S04.3 AC4 refuses a reviewNote that is not a string', () => {
    expect(Submission.safeParse({ ...submission, reviewNote: 42 }).success).toBe(false);
    expect(SubmissionSummary.safeParse({ ...summary, reviewNote: ['a'] }).success).toBe(false);
  });
});
