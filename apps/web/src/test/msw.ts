import {
  AdminUser,
  AdminUserList,
  CATEGORIES,
  CurrentUser,
  HAZARD_LEVELS,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  MetaListsResponse,
  MySubmissions,
  Photo,
  PROTECTIVE_EQUIPMENT,
  PublishedSafetyPage,
  ErrorResponse,
  ReviewDecision,
  ReviewQueue,
  ReviewSubmission,
  SafetyPageContent,
  SafetyPageDisplay,
  SessionResponse,
  Submission,
  type AccountStatus,
  type ErrorCode,
  type Role,
} from '@labsafe/shared';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// The network for the web component tests. Fixtures are parsed with the shared schemas, so they
// always match the contract. Override a handler in one test with `server.use(…)`.

export const metaListsFixture = MetaListsResponse.parse({
  hazardTypes: HAZARD_TYPES,
  protectiveEquipment: PROTECTIVE_EQUIPMENT,
  hazardPictograms: HAZARD_PICTOGRAMS,
  categories: CATEGORIES,
  hazardLevels: HAZARD_LEVELS,
  labRooms: [
    { id: '0b6f8d2e-6a43-4c1b-9d2a-1f3e5a7c9b01', code: 'LAB-101', name: 'Teaching lab 1' },
    { id: '0b6f8d2e-6a43-4c1b-9d2a-1f3e5a7c9b02', code: 'LAB-102', name: 'Teaching lab 2' },
  ],
});

function userFixture(id: string, name: string, role: Role, status: AccountStatus): CurrentUser {
  const email = `${name.split(' ')[0]?.toLowerCase() ?? 'user'}@lab.test`;
  return CurrentUser.parse({ id, name, email, role, status });
}

/** One signed-in account per status, and an admin (S02.1 AC8). */
export const pendingUser = userFixture(
  '5d7e1c2a-3b4f-4a6d-8e9f-0a1b2c3d4e01',
  'Sara Pending',
  'CONTRIBUTOR',
  'PENDING',
);
export const approvedUser = userFixture(
  '5d7e1c2a-3b4f-4a6d-8e9f-0a1b2c3d4e02',
  'Anna Approved',
  'CONTRIBUTOR',
  'APPROVED',
);
export const rejectedUser = userFixture(
  '5d7e1c2a-3b4f-4a6d-8e9f-0a1b2c3d4e03',
  'Rafael Rejected',
  'CONTRIBUTOR',
  'REJECTED',
);
export const adminUser = userFixture(
  '5d7e1c2a-3b4f-4a6d-8e9f-0a1b2c3d4e04',
  'Adam Admin',
  'ADMIN',
  'APPROVED',
);

export const ME = '*/api/auth/me';

/** `GET /api/auth/me` answering with `user` (null: anonymous). Use with `server.use(…)`. */
export function meHandler(user: CurrentUser | null) {
  return http.get(ME, () => HttpResponse.json(SessionResponse.parse({ user })));
}

/** `GET /api/admin/users?status=PENDING` and the two sign-up actions (S02.2). */
export const ADMIN_USERS = '*/api/admin/users';
export const APPROVE = '*/api/admin/users/:id/approve';
export const REJECT = '*/api/admin/users/:id/reject';

function signUpFixture(id: string, name: string, email: string, createdAt: string): AdminUser {
  return AdminUser.parse({ id, name, email, role: 'CONTRIBUTOR', status: 'PENDING', createdAt });
}

/** Two pending sign-ups, oldest first, as the server lists them. Midday UTC, so the date is the same in every time zone of the lab. */
export const pendingSignUps: AdminUser[] = [
  signUpFixture(
    '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c01',
    'Olga Older',
    'olga@lab.test',
    '2026-11-23T12:00:00.000Z',
  ),
  signUpFixture(
    '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c02',
    'Nina Newer',
    'nina@lab.test',
    '2026-11-24T12:00:00.000Z',
  ),
];

/** `PUT /api/admin/users/:id/role` (S02.3). */
export const ROLE = '*/api/admin/users/:id/role';

function accountFixture(user: CurrentUser): AdminUser {
  return AdminUser.parse({ ...user, createdAt: '2026-11-02T12:00:00.000Z' });
}

/**
 * The approved accounts as the server lists them, by name then email: the signed-in admin
 * (`adminUser`), an approved contributor (`approvedUser`) and a second admin.
 */
export const approvedAccounts: AdminUser[] = [
  accountFixture(adminUser),
  accountFixture(approvedUser),
  accountFixture(
    userFixture('5d7e1c2a-3b4f-4a6d-8e9f-0a1b2c3d4e05', 'Bruno Boss', 'ADMIN', 'APPROVED'),
  ),
];

/** `GET /api/admin/users` answering with `users`. Use with `server.use(…)`. */
export function adminUsersHandler(users: AdminUser[]) {
  return http.get(ADMIN_USERS, () => HttpResponse.json(AdminUserList.parse({ users })));
}

/** An error body as the API sends it. */
export function errorResponse(statusCode: number, code: ErrorCode, message: string) {
  return HttpResponse.json(ErrorResponse.parse({ statusCode, code, message }), {
    status: statusCode,
  });
}

/** `POST /api/photos`, `GET /api/photos/:id` (S03.1). */
export const PHOTOS = '*/api/photos';
export const PHOTO = '*/api/photos/:id';

/**
 * The name and type of the file in the multipart field `field` of `request`, read from the raw
 * body (MSW's `formData()` can't parse it under jsdom), or undefined when there is none.
 */
export async function uploadedFile(
  request: Request,
  field: string,
): Promise<{ name: string; type: string } | undefined> {
  const body = await request.text();
  const match = new RegExp(
    `Content-Disposition: form-data; name="${field}"; filename="([^"]*)"\\r\\nContent-Type: ([^\\r]*)`,
  ).exec(body);
  return match?.[1] !== undefined && match[2] !== undefined
    ? { name: match[1], type: match[2] }
    : undefined;
}

/** The photo `POST /api/photos` stores by default. */
export const photoFixture = Photo.parse({
  id: '9c4e2a1b-7d3f-4e5a-8b6c-1d2e3f4a5b01',
  width: 1600,
  height: 1200,
});

/** `POST /api/submissions`, `GET /api/submissions/mine` (S03.1). */
export const SUBMISSIONS = '*/api/submissions';
export const MY_SUBMISSIONS = '*/api/submissions/mine';

/** A complete, valid "Rotary evaporator" page, as the shared schema returns it. */
export const rotavapContent = SafetyPageContent.parse({
  name: 'Rotary evaporator',
  photoId: photoFixture.id,
  manufacturer: 'Büchi',
  model: null,
  category: 'SEPARATION_EVAPORATION',
  labRoomId: metaListsFixture.labRooms[0]?.id,
  description: 'Removes solvents under reduced pressure.',
  responsibleName: 'Dr. Lee',
  responsibleContact: 'lee@lab.test',
  hazardLevel: 'MEDIUM',
  trainingRequired: true,
  trainingGivenBy: 'Dr. Lee',
  hazards: [{ type: 'HOT_SURFACE', note: 'The water bath reaches 90 °C.' }],
  noSignificantHazards: false,
  pictograms: ['FLAMMABLE'],
  protectiveEquipment: [{ item: 'SAFETY_GLASSES', note: null }],
  standardLabAttireOnly: false,
  beforeUse: 'Check the glassware for cracks.',
  safeOperation: 'Start the rotation before the vacuum.',
  doNot: 'Do not heat a closed system.',
  emergency: 'Stop the bath, vent the system and call for help.',
  emergencyPhone: '112',
  emergencyEquipment: {
    EYEWASH: { kind: 'LOCATION', location: 'Next to the door' },
    SAFETY_SHOWER: { kind: 'LOCATION', location: 'Corridor, room 1.02' },
    FIRE_EXTINGUISHER: { kind: 'LOCATION', location: 'Left of the fume hood' },
    SPILL_KIT: { kind: 'LOCATION', location: 'Under the sink' },
    FIRST_AID_KIT: { kind: 'LOCATION', location: 'On the wall by the door' },
    EMERGENCY_STOP: { kind: 'NOT_APPLICABLE' },
  },
});

/** `rotavapContent` as `SafetyPageView` shows it (S04.1): its room filled in, never approved. */
export const rotavapDisplay = SafetyPageDisplay.parse({
  content: rotavapContent,
  labRoom: metaListsFixture.labRooms[0],
  lastApproved: null,
});

/** The 201 answer to submitting `rotavapContent` as `approvedUser`. Midday UTC, as above. */
export const rotavapSubmission = Submission.parse({
  id: '3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e01',
  kind: 'NEW',
  status: 'PENDING',
  submittedAt: '2026-11-24T12:00:00.000Z',
  updatedAt: '2026-11-24T12:00:00.000Z',
  submittedBy: { id: approvedUser.id, name: approvedUser.name },
  content: rotavapContent,
  slug: null,
  reviewNote: null,
});

/** `GET /api/submissions/mine` with the submitted "Rotary evaporator". */
export const mySubmissionsFixture = MySubmissions.parse({
  submissions: [
    {
      id: rotavapSubmission.id,
      name: rotavapSubmission.content.name,
      status: rotavapSubmission.status,
      submittedAt: rotavapSubmission.submittedAt,
      slug: null,
      reviewNote: null,
    },
  ],
});

/** `GET /api/submissions/mine` answering with `list`. Use with `server.use(…)`. */
export function mySubmissionsHandler(list: MySubmissions) {
  return http.get(MY_SUBMISSIONS, () => HttpResponse.json(MySubmissions.parse(list)));
}

/** `GET` and `PUT /api/submissions/:id` (S03.2). It also matches `/mine`: a GET handler must fall through (return undefined) for other ids. */
export const SUBMISSION = '*/api/submissions/:id';

/** `GET /api/admin/review-queue` (S04.1). */
export const REVIEW_QUEUE = '*/api/admin/review-queue';

/**
 * Three pending pages, oldest submission first, as the server lists them: one by
 * `approvedUser`, one by a second contributor and the signed-in admin's own. Midday UTC.
 */
export const reviewQueueFixture = ReviewQueue.parse({
  items: [
    {
      id: '4a3b2c1d-0e9f-4a8b-9c7d-6e5f4a3b2c01',
      name: 'Rotary evaporator',
      kind: 'NEW',
      submittedBy: { id: approvedUser.id, name: approvedUser.name },
      submittedAt: '2026-11-23T12:00:00.000Z',
    },
    {
      id: '4a3b2c1d-0e9f-4a8b-9c7d-6e5f4a3b2c02',
      name: 'Fume hood',
      kind: 'NEW',
      submittedBy: { id: '5d7e1c2a-3b4f-4a6d-8e9f-0a1b2c3d4e06', name: 'Carla Contributor' },
      submittedAt: '2026-11-24T12:00:00.000Z',
    },
    {
      id: '4a3b2c1d-0e9f-4a8b-9c7d-6e5f4a3b2c03',
      name: 'Centrifuge',
      kind: 'NEW',
      submittedBy: { id: adminUser.id, name: adminUser.name },
      submittedAt: '2026-11-25T12:00:00.000Z',
    },
  ],
});

/** `GET /api/admin/review-queue` answering with `queue`. Use with `server.use(…)`. */
export function reviewQueueHandler(queue: ReviewQueue) {
  return http.get(REVIEW_QUEUE, () => HttpResponse.json(ReviewQueue.parse(queue)));
}

/** `GET /api/admin/submissions/:id` (S04.1). */
export const ADMIN_SUBMISSION = '*/api/admin/submissions/:id';

/** The queue's first page, "Rotary evaporator" by `approvedUser`, as the admin's preview loads it. */
export const reviewSubmissionFixture = ReviewSubmission.parse({
  id: reviewQueueFixture.items[0]?.id,
  kind: 'NEW',
  status: 'PENDING',
  submittedAt: reviewQueueFixture.items[0]?.submittedAt,
  submittedBy: { id: approvedUser.id, name: approvedUser.name },
  version: 1,
  page: rotavapDisplay,
});

/**
 * `GET /api/admin/submissions/:id` answering with `submission` for its own id and 404 for any
 * other. Use with `server.use(…)`.
 */
export function reviewSubmissionHandler(submission: ReviewSubmission) {
  return http.get(ADMIN_SUBMISSION, ({ params }) =>
    params.id === submission.id
      ? HttpResponse.json(ReviewSubmission.parse(submission))
      : errorResponse(404, 'NOT_FOUND', 'Not found.'),
  );
}

/** `POST /api/admin/submissions/:id/approve` (S04.2). */
export const APPROVE_SUBMISSION = '*/api/admin/submissions/:id/approve';

/** The 200 answer to approving `reviewSubmissionFixture`: published at `rotary-evaporator`. */
export const approveDecisionFixture = ReviewDecision.parse({
  id: reviewSubmissionFixture.id,
  status: 'APPROVED',
  slug: 'rotary-evaporator',
});

/** `POST /api/admin/submissions/:id/reject` (S04.3). */
export const REJECT_SUBMISSION = '*/api/admin/submissions/:id/reject';

/** The 200 answer to rejecting `reviewSubmissionFixture`: a rejected page has no public address. */
export const rejectDecisionFixture = ReviewDecision.parse({
  id: reviewSubmissionFixture.id,
  status: 'REJECTED',
  slug: null,
});

/** `GET /api/instruments/:slug` (S04.2): a published page for anyone. */
export const INSTRUMENT = '*/api/instruments/:slug';

/**
 * "Rotary evaporator" as the public page loads it once `adminUser` approved it: no contributor,
 * no email, no version. Midday UTC, so the date is the same in every time zone of the lab.
 */
export const publishedPageFixture = PublishedSafetyPage.parse({
  slug: approveDecisionFixture.slug,
  page: {
    ...rotavapDisplay,
    lastApproved: { at: '2026-11-26T12:00:00.000Z', approverName: adminUser.name },
  },
});

/**
 * `GET /api/instruments/:slug` answering with `published` for its own slug and 404 for any other.
 * Use with `server.use(…)`.
 */
export function publishedPageHandler(published: PublishedSafetyPage) {
  return http.get(INSTRUMENT, ({ params }) =>
    params.slug === published.slug
      ? HttpResponse.json(PublishedSafetyPage.parse(published))
      : errorResponse(404, 'NOT_FOUND', 'Not found.'),
  );
}

export const handlers = [
  http.get('*/api/meta/lists', () => HttpResponse.json(metaListsFixture)),
  // By default nobody is signed in.
  meHandler(null),
  // Every test that lands on `/contribute` loads My submissions (S03.1); by default it is empty.
  http.get(MY_SUBMISSIONS, () => HttpResponse.json(MySubmissions.parse({ submissions: [] }))),
];

export const server = setupServer(...handlers);
