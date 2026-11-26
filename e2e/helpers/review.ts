/**
 * Shared steps of the review journeys (S04.1, S04.2, S04.3): a unique page name per test, open
 * "Pages to review" from the header, find one pending page's row by its name, open its preview,
 * approve or reject it there, and submit or publish a page through the API with `request` contexts.
 */
import { readFile } from 'node:fs/promises';
import {
  expect,
  request,
  type APIRequestContext,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { TEST_ADMIN, TEST_BASE_URL } from '../test-env';
import { banner, newAccount, type Account } from './accounts';
import { INSTRUMENT_JPEG, ROTAVAP_NAME } from './safety-page';

/**
 * A page name of its own per test and project ("Rotary evaporator <unique>"), because both widths
 * share one database and other specs leave pending pages in the list.
 */
export function uniquePageName(testInfo: TestInfo): string {
  const id = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${ROTAVAP_NAME} ${id}`;
}

/** Today in the app's date format ("26 Nov 2026"), in the browser's time zone. */
export function todayInBrowser(page: Page): Promise<string> {
  return page.evaluate(() =>
    new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date()),
  );
}

/** Follows the header's "Pages to review" link and waits for the loaded list. */
export async function openReviewQueue(page: Page) {
  await banner(page).getByRole('link', { name: 'Pages to review' }).click();
  await expect(page).toHaveURL('/admin/review');
  await expect(page.getByRole('heading', { name: 'Pages to review', level: 1 })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Pages to review' })).toBeVisible();
}

/** The row of one pending page in "Pages to review"; other tests' pages may be listed too. */
export function reviewRow(page: Page, name: string) {
  return page
    .getByRole('list', { name: 'Pages to review' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name, exact: true }) });
}

/**
 * Follows the name of one pending page in "Pages to review" and waits for the loaded preview;
 * returns the submission's id from the address.
 */
export async function openReviewSubmission(page: Page, name: string): Promise<string> {
  await reviewRow(page, name).getByRole('link', { name, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/review\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Review a new page', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name, level: 2, exact: true })).toBeVisible();
  const id = new URL(page.url()).pathname.split('/').pop();
  if (!id) {
    throw new Error(`The preview has no id in its address: ${page.url()}`);
  }
  return id;
}

/** The public address the server makes from a page name (S04.2 AC2), for names without accents. */
export function expectedSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Presses "Approve" on the open preview of the page called `name` and waits for "Pages to review"
 * with the confirmation (S04.2 AC1); returns the address of the link "Open the public page".
 */
export async function approveFromPreview(page: Page, name: string): Promise<string> {
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page).toHaveURL('/admin/review');
  const confirmation = page.getByRole('status').filter({ hasText: 'was approved' });
  await expect(confirmation).toContainText(`${name} was approved and published.`);
  const link = confirmation.getByRole('link', { name: 'Open the public page' });
  const href = await link.getAttribute('href');
  if (!href) {
    throw new Error('The confirmation has no link to the public page.');
  }
  return href;
}

/**
 * Writes `note` in "Note for the contributor" on the open preview of the page called `name`,
 * presses "Reject" and waits for "Pages to review" with the confirmation, without the row (S04.3 AC1).
 */
export async function rejectFromPreview(page: Page, name: string, note: string) {
  await page.getByLabel('Note for the contributor', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page).toHaveURL('/admin/review');
  await expect(page.getByRole('status').filter({ hasText: 'was rejected' })).toHaveText(
    `${name} was rejected. The contributor can see your note.`,
  );
  await expect(reviewRow(page, name)).toHaveCount(0);
}

/** A request context of its own (cookies included), like a separate browser. */
function newApiContext(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: TEST_BASE_URL });
}

async function expectOk(response: Awaited<ReturnType<APIRequestContext['get']>>, what: string) {
  if (!response.ok()) {
    throw new Error(`${what} answered ${response.status()}: ${await response.text()}`);
  }
}

/** A request context logged in as the setup admin (`TEST_ADMIN`). */
async function setupAdminApi(): Promise<APIRequestContext> {
  const admin = await newApiContext();
  const login = await admin.post('/api/auth/login', {
    data: { email: TEST_ADMIN.email, password: TEST_ADMIN.password },
  });
  await expectOk(login, 'Logging in as the setup admin');
  return admin;
}

/** What a page made through the API holds besides its name, photo and lab room. */
export type ApiPageOptions = {
  /** Hazard type values (`HAZARD_TYPES`), each with a note; default one hot surface. */
  hazards?: readonly string[];
  /** PPE item values (`PROTECTIVE_EQUIPMENT`); default safety glasses. */
  protectiveEquipment?: readonly string[];
};

/** A complete `SafetyPageContent` called `name`, a medium hazard page that needs training. */
function pageContent(name: string, photoId: string, labRoomId: string, options: ApiPageOptions) {
  const emergencyEquipment = Object.fromEntries(
    ['EYEWASH', 'SAFETY_SHOWER', 'FIRE_EXTINGUISHER', 'SPILL_KIT', 'FIRST_AID_KIT'].map((item) => [
      item,
      { kind: 'LOCATION', location: 'Next to the door' },
    ]),
  );
  return {
    name,
    photoId,
    manufacturer: 'Büchi',
    model: null,
    category: 'SEPARATION_EVAPORATION',
    labRoomId,
    description: 'Removes solvents under reduced pressure.',
    responsibleName: 'Dr. Lee',
    responsibleContact: 'lee@lab.test',
    hazardLevel: 'MEDIUM',
    trainingRequired: true,
    trainingGivenBy: 'Dr. Lee',
    hazards: (options.hazards ?? ['HOT_SURFACE']).map((type) => ({
      type,
      note: 'Arises while the instrument runs.',
    })),
    noSignificantHazards: false,
    pictograms: [],
    protectiveEquipment: (options.protectiveEquipment ?? ['SAFETY_GLASSES']).map((item) => ({
      item,
      note: null,
    })),
    standardLabAttireOnly: false,
    beforeUse: 'Check the glassware for cracks.',
    safeOperation: 'Start the rotation before the vacuum.',
    doNot: 'Do not heat a closed system.',
    emergency: 'Stop the bath, vent the system and call for help.',
    emergencyPhone: '112',
    emergencyEquipment: { ...emergencyEquipment, EMERGENCY_STOP: { kind: 'NOT_APPLICABLE' } },
  };
}

/** A pending page submitted through the API: its submission id and photo id. */
export type ApiSubmission = { id: string; photoId: string };

/** An approved contributor with a request context of its own, to submit pages through the API. */
export type ApiContributor = {
  account: Account;
  /** Uploads the photo and submits a complete page called `name` (S03.1 API contract). */
  submit: (name: string, options?: ApiPageOptions) => Promise<ApiSubmission>;
  dispose: () => Promise<void>;
};

/**
 * Signs a new person up through the API and approves them as the setup admin, in request
 * contexts of their own (no browser is touched).
 */
export async function apiContributor(testInfo: TestInfo): Promise<ApiContributor> {
  const account = newAccount(testInfo);
  const contributor = await newApiContext();
  const signUp = await contributor.post('/api/auth/signup', { data: account });
  await expectOk(signUp, 'Signing up');
  const { id } = (await signUp.json()) as { id: string };

  const admin = await setupAdminApi();
  try {
    await expectOk(
      await admin.post(`/api/admin/users/${id}/approve`, { data: {} }),
      'Approving the sign-up',
    );
  } finally {
    await admin.dispose();
  }

  const lists = await contributor.get('/api/meta/lists');
  await expectOk(lists, 'Loading the lists');
  const { labRooms } = (await lists.json()) as { labRooms: { id: string }[] };
  const firstRoom = labRooms[0]?.id;
  if (!firstRoom) {
    throw new Error('The test database has no lab room.');
  }
  const labRoomId: string = firstRoom;
  const jpeg = await readFile(INSTRUMENT_JPEG);

  async function submit(name: string, options: ApiPageOptions = {}): Promise<ApiSubmission> {
    const upload = await contributor.post('/api/photos', {
      multipart: { photo: { name: 'instrument.jpg', mimeType: 'image/jpeg', buffer: jpeg } },
    });
    await expectOk(upload, 'Uploading the photo');
    const { id: photoId } = (await upload.json()) as { id: string };
    const submitted = await contributor.post('/api/submissions', {
      data: pageContent(name, photoId, labRoomId, options),
    });
    await expectOk(submitted, 'Submitting the page');
    const { id: submissionId } = (await submitted.json()) as { id: string };
    return { id: submissionId, photoId };
  }

  return { account, submit, dispose: () => contributor.dispose() };
}

/**
 * Approves a pending submission as the setup admin through the API, with the `version` its
 * preview shows (S04.2 AC1, AC9); returns the public address's slug.
 */
export async function approveThroughApi(submissionId: string): Promise<string> {
  const admin = await setupAdminApi();
  try {
    const preview = await admin.get(`/api/admin/submissions/${submissionId}`);
    await expectOk(preview, 'Loading the preview');
    const { version } = (await preview.json()) as { version: number };
    const approve = await admin.post(`/api/admin/submissions/${submissionId}/approve`, {
      data: { version },
    });
    await expectOk(approve, 'Approving the page');
    const { slug } = (await approve.json()) as { slug: string | null };
    if (!slug) {
      throw new Error('The approved page has no slug.');
    }
    return slug;
  } finally {
    await admin.dispose();
  }
}
