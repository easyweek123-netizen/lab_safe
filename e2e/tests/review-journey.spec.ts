/**
 * The epic's whole review journey C2–C8 in the browser (S04.3 AC11): a contributor submits a page,
 * the setup admin rejects it from the preview with a note, the contributor sees "Rejected" with the
 * note, fixes the photo and Safe operation in the fix form and resubmits; the page is "Pending"
 * with no note and back in "Pages to review" with its new date, the admin approves it, and the
 * contributor sees "Approved" with the link. An anonymous visitor in a fresh browser gets "not
 * found" for the address, the API and the photo while the page is pending and while it is
 * rejected, then sees the public page with the new photo, while the replaced photo stays "not
 * found" to them and opens for its owner (AC9). Runs in the `desktop` (1280 × 800) and `mobile`
 * (375 × 812) projects with a fresh account and page name per test.
 */
import { readFile } from 'node:fs/promises';
import { expect, test, type Browser, type Page } from '@playwright/test';
import {
  banner,
  expectContributorArea,
  hasNoHorizontalScroll,
  logIn,
  logInAsAdmin,
  signUpApproved,
  type Account,
} from '../helpers/accounts';
import {
  approveFromPreview,
  expectedSlug,
  openReviewQueue,
  openReviewSubmission,
  rejectFromPreview,
  reviewRow,
  uniquePageName,
} from '../helpers/review';
import { INSTRUMENT_JPEG, submitCompletePage } from '../helpers/safety-page';

const NOTE = 'The photo is blurry; add the waste step to Safe operation.';
const FIXED_SAFE_OPERATION =
  'Start the rotation before the vacuum. Empty the receiving flask into the solvent waste.';

/** A fresh browser context (no cookies) at the width of `page`, so its checks run at it too. */
function anonymousContext(browser: Browser, page: Page) {
  return browser.newContext({ viewport: page.viewportSize() });
}

/**
 * In a fresh browser, the public address, the API and the photo of a page that is not published
 * all answer "not found" (S04.3 AC9).
 */
async function expectNotPublic(browser: Browser, page: Page, slug: string, photoId: string) {
  const anonymous = await anonymousContext(browser, page);
  try {
    const visitor = await anonymous.newPage();
    await visitor.goto(`/instruments/${slug}`);
    await expect(visitor.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
    expect((await anonymous.request.get(`/api/instruments/${slug}`)).status()).toBe(404);
    const photo = await anonymous.request.get(`/api/photos/${photoId}`);
    expect(photo.status()).toBe(404);
    expect(await photo.json()).toMatchObject({ code: 'NOT_FOUND' });
  } finally {
    await anonymous.close();
  }
}

async function logOut(page: Page) {
  await banner(page).getByRole('button', { name: 'Log out' }).click();
  await expect(banner(page).getByRole('link', { name: 'Log in' })).toBeVisible();
}

async function logInAs(page: Page, account: Account) {
  await page.goto('/login');
  await logIn(page, account.email, account.password);
  await expect(page).toHaveURL('/contribute');
}

/** The contributor's row of the page called `name` in "My submissions". */
function mySubmissionRow(page: Page, name: string) {
  return page
    .getByRole('list', { name: 'My submissions' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name, exact: true }) });
}

/** The `dateTime` of the "Submitted <date>" line of a row in "Pages to review". */
async function queueSubmittedAt(page: Page, name: string): Promise<string> {
  const dateTime = await reviewRow(page, name).locator('time').getAttribute('datetime');
  if (!dateTime) {
    throw new Error(`The row of ${name} has no submission date.`);
  }
  return dateTime;
}

/** The id of the photo the form's preview shows. */
async function formPhotoId(page: Page): Promise<string> {
  const src = await page.getByRole('img', { name: 'Photo of the instrument' }).getAttribute('src');
  const id = src?.split('/').pop();
  if (!id) {
    throw new Error(`The photo preview has no id in its address: ${String(src)}`);
  }
  return id;
}

test('S04.3 AC11 AC9 submit → preview → reject with the note → "Rejected" with the note → fix the photo and Safe operation → resubmit → "Pending" with no note → back in "Pages to review" with the new date → approve → "Approved" with the link → the anonymous visitor sees the public page, after "not found" while pending and rejected, and "not found" for the replaced photo', async ({
  browser,
  page,
}, testInfo) => {
  const name = uniquePageName(testInfo);
  const slug = expectedSlug(name);

  // C2: a new approved contributor, in their existing session, submits a complete page.
  const contributor = await signUpApproved(browser, page, testInfo);
  await page.reload();
  await expect(page).toHaveURL('/contribute');
  await expectContributorArea(page);
  const oldPhotoId = await submitCompletePage(page, name);

  // AC9: while pending, the anonymous visitor finds nothing.
  await expectNotPublic(browser, page, slug, oldPhotoId);

  // AC1: the setup admin opens the preview, writes the note and rejects.
  await logOut(page);
  await logInAsAdmin(page);
  await openReviewQueue(page);
  const firstSubmittedAt = await queueSubmittedAt(page, name);
  const id = await openReviewSubmission(page, name);
  const note = page.getByLabel('Note for the contributor', { exact: true });
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
  await expect(note).toBeVisible();
  // AC11: the preview with the note field doesn't scroll sideways.
  expect(await hasNoHorizontalScroll(page)).toBe(true);
  await rejectFromPreview(page, name, NOTE);

  // AC9: while rejected, the anonymous visitor still finds nothing.
  await expectNotPublic(browser, page, slug, oldPhotoId);

  // AC4: the contributor's "My submissions" shows "Rejected" and the note word for word.
  await logOut(page);
  await logInAs(page, contributor);
  const row = mySubmissionRow(page, name);
  await expect(row).toHaveCount(1);
  await expect(row.getByText('Status: Rejected', { exact: true })).toBeVisible();
  await expect(row.getByText(`Admin's note: ${NOTE}`, { exact: true })).toBeVisible();
  await expect(row.getByRole('link', { name, exact: true })).toHaveAttribute(
    'href',
    `/contribute/submissions/${id}`,
  );
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // AC5: the fix form with the note above it, filled in with what was submitted.
  await row.getByRole('link', { name, exact: true }).click();
  await expect(page).toHaveURL(`/contribute/submissions/${id}`);
  await expect(page.getByRole('heading', { name: 'Fix safety page', level: 1 })).toBeVisible();
  const noteSection = page.getByRole('region', { name: "Admin's note" });
  await expect(noteSection.getByRole('heading', { name: "Admin's note", level: 2 })).toBeVisible();
  await expect(noteSection.getByText(NOTE, { exact: true })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(name);
  await expect(page.getByLabel('Safe operation', { exact: true })).toHaveValue(
    'Start the rotation before the vacuum.',
  );
  expect(await formPhotoId(page)).toBe(oldPhotoId);
  const resubmit = page.getByRole('button', { name: 'Resubmit for review' });
  await expect(resubmit).toBeVisible();
  // AC11: the fix form doesn't scroll sideways.
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // AC6: a new photo through "Change photo" and a new Safe operation text, then resubmit.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Change photo' }).click();
  await (
    await chooser
  ).setFiles({
    name: 'instrument-sharper.jpg',
    mimeType: 'image/jpeg',
    buffer: await readFile(INSTRUMENT_JPEG),
  });
  await expect(page.getByRole('img', { name: 'Photo of the instrument' })).not.toHaveAttribute(
    'src',
    new RegExp(`/api/photos/${oldPhotoId}$`),
  );
  const newPhotoId = await formPhotoId(page);
  expect(newPhotoId).not.toBe(oldPhotoId);
  await page.getByLabel('Safe operation', { exact: true }).fill(FIXED_SAFE_OPERATION);
  await resubmit.click();
  await expect(page).toHaveURL('/contribute');
  await expect(page.getByRole('status')).toHaveText(
    `${name} was resubmitted and is waiting for review.`,
  );
  await expect(row.getByText('Status: Pending', { exact: true })).toBeVisible();
  await expect(row.getByText(/Admin's note/)).toHaveCount(0);

  // AC9: pending again, the anonymous visitor finds neither photo.
  await expectNotPublic(browser, page, slug, newPhotoId);

  // AC6: "Pages to review" lists it again with the resubmission date, after the earlier pages.
  await logOut(page);
  await logInAsAdmin(page);
  await openReviewQueue(page);
  await expect(reviewRow(page, name)).toHaveCount(1);
  const resubmittedAt = await queueSubmittedAt(page, name);
  expect(Date.parse(resubmittedAt)).toBeGreaterThan(Date.parse(firstSubmittedAt));
  await expect(
    page.getByRole('list', { name: 'Pages to review' }).getByRole('listitem').last(),
  ).toContainText(name);

  // The preview shows the fixed page; the admin approves it.
  await openReviewSubmission(page, name);
  await expect(page.getByText(FIXED_SAFE_OPERATION, { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: `Photo of ${name}` })).toHaveAttribute(
    'src',
    new RegExp(`/api/photos/${newPhotoId}$`),
  );
  const publicPath = await approveFromPreview(page, name);
  expect(publicPath).toBe(`/instruments/${slug}`);

  // The contributor's "My submissions" shows "Approved" with the link to the public page; the
  // replaced photo still opens for its owner.
  await logOut(page);
  await logInAs(page, contributor);
  await expect(row.getByText('Status: Approved', { exact: true })).toBeVisible();
  await expect(row.getByText(/Admin's note/)).toHaveCount(0);
  await expect(row.getByRole('link', { name, exact: true })).toHaveAttribute('href', publicPath);
  expect((await page.request.get(`/api/photos/${oldPhotoId}`)).status()).toBe(200);

  // AC9: the anonymous visitor sees the public page with the new photo; the replaced one is
  // "not found".
  const anonymous = await anonymousContext(browser, page);
  try {
    const visitor = await anonymous.newPage();
    await visitor.goto(publicPath);
    await expect(visitor.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
    await expect(visitor.getByText(FIXED_SAFE_OPERATION, { exact: true })).toBeVisible();
    await expect(visitor.getByRole('img', { name: `Photo of ${name}` })).toHaveAttribute(
      'src',
      new RegExp(`/api/photos/${newPhotoId}$`),
    );
    await expect(visitor.getByText(NOTE)).toHaveCount(0);
    const api = await anonymous.request.get(`/api/instruments/${slug}`);
    expect(api.status()).toBe(200);
    expect(await api.text()).not.toContain(NOTE);
    const newPhoto = await anonymous.request.get(`/api/photos/${newPhotoId}`);
    expect(newPhoto.status()).toBe(200);
    expect(newPhoto.headers()['content-type']).toContain('image/jpeg');
    expect((await anonymous.request.get(`/api/photos/${oldPhotoId}`)).status()).toBe(404);
    expect(await hasNoHorizontalScroll(visitor)).toBe(true);
  } finally {
    await anonymous.close();
  }
});
