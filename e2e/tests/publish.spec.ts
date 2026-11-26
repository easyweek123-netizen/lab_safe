/**
 * The S04.2 journey in the browser: a contributor submits a page, the setup admin approves it from
 * the preview, the confirmation link opens the public page, which shows the same text as the
 * preview; an anonymous visitor in a fresh browser sees it, and the contributor's "My submissions"
 * shows "Approved" with the link. Before approval the address, the API and the photo answer "not
 * found"; a published page with 4 hazards and 4 PPE items shows the essentials on the first screen
 * at 375 × 812; an admin can approve their own page. Runs in the `desktop` (1280 × 800) and
 * `mobile` (375 × 812) projects with fresh accounts and page names per test.
 */
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { TEST_ADMIN } from '../test-env';
import {
  banner,
  expectContributorArea,
  hasNoHorizontalScroll,
  logIn,
  logInAsAdmin,
  signUpApproved,
} from '../helpers/accounts';
import {
  apiContributor,
  approveFromPreview,
  approveThroughApi,
  expectedSlug,
  openReviewQueue,
  openReviewSubmission,
  reviewRow,
  todayInBrowser,
  uniquePageName,
} from '../helpers/review';
import { submitCompletePage } from '../helpers/safety-page';

/** The lines of text `SafetyPageView` shows, without the "Last approved" line (AC5). */
async function viewText(page: Page): Promise<string[]> {
  const text = await page.getByRole('article').innerText();
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('Last approved'));
}

/** Waits for the loaded public page of `name`: its title is the page's only h1. */
async function expectPublicPage(page: Page, name: string) {
  await expect(page.getByRole('heading', { name, level: 1, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
}

/** A fresh browser context (no cookies) at the width of `page`, so its checks run at it too. */
function anonymousContext(browser: Browser, page: Page) {
  return browser.newContext({ viewport: page.viewportSize() });
}

async function logOut(page: Page) {
  await banner(page).getByRole('button', { name: 'Log out' }).click();
  await expect(banner(page).getByRole('link', { name: 'Log in' })).toBeVisible();
}

test('S04.2 AC15 AC5 a contributor submits → the admin approves from the preview → the link opens the public page, same as the preview → an anonymous visitor sees it → "My submissions" shows "Approved" with the link', async ({
  browser,
  page,
}, testInfo) => {
  const name = uniquePageName(testInfo);
  const slug = expectedSlug(name);

  // A new approved contributor, in their existing session, submits a complete page.
  const contributor = await signUpApproved(browser, page, testInfo);
  await page.reload();
  await expect(page).toHaveURL('/contribute');
  await expectContributorArea(page);
  const photoId = await submitCompletePage(page, name);

  // The setup admin logs in in the same window, so the checks run at this project's width.
  await logOut(page);
  await logInAsAdmin(page);
  const today = await todayInBrowser(page);
  await openReviewQueue(page);
  await openReviewSubmission(page, name);
  const previewText = await viewText(page);
  expect(previewText).toContain(name);

  // AC1: approving goes back to "Pages to review" with the confirmation and the link; the row is gone.
  const publicPath = await approveFromPreview(page, name);
  expect(publicPath).toBe(`/instruments/${slug}`);
  await expect(reviewRow(page, name)).toHaveCount(0);

  // The confirmation link opens the public page.
  await page.getByRole('link', { name: 'Open the public page' }).click();
  await expect(page).toHaveURL(publicPath);
  await expectPublicPage(page, name);
  await expect(
    page.getByText(`Last approved ${today} by ${TEST_ADMIN.name}`, { exact: true }),
  ).toBeVisible();

  // AC5: the same text, field by field and in the same order, except the "Last approved" line.
  expect(await viewText(page)).toEqual(previewText);
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // An anonymous visitor in a fresh browser sees the page and its photo, and nothing about the
  // contributor.
  const anonymous = await anonymousContext(browser, page);
  try {
    const visitor = await anonymous.newPage();
    await visitor.goto(publicPath);
    await expectPublicPage(visitor, name);
    await expect(banner(visitor).getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(visitor.getByRole('img', { name: `Photo of ${name}` })).toBeVisible();
    await expect(
      visitor.getByText(`Last approved ${today} by ${TEST_ADMIN.name}`, { exact: true }),
    ).toBeVisible();
    expect(await viewText(visitor)).toEqual(previewText);
    await expect(visitor.getByText(contributor.name)).toHaveCount(0);
    await expect(visitor.getByText(contributor.email)).toHaveCount(0);
    const photo = await anonymous.request.get(`/api/photos/${photoId}`);
    expect(photo.status()).toBe(200);
    expect(photo.headers()['content-type']).toContain('image/jpeg');
    expect(await hasNoHorizontalScroll(visitor)).toBe(true);
  } finally {
    await anonymous.close();
  }

  // AC10: the contributor's "My submissions" shows "Approved" and the name links to the public page.
  await logOut(page);
  await page.goto('/login');
  await logIn(page, contributor.email, contributor.password);
  await expect(page).toHaveURL('/contribute');
  const row = page
    .getByRole('list', { name: 'My submissions' })
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name, exact: true }) });
  await expect(row).toHaveCount(1);
  await expect(row.getByText('Status: Approved', { exact: true })).toBeVisible();
  await expect(row.getByRole('link', { name, exact: true })).toHaveAttribute('href', publicPath);
  await expect(row.getByRole('link')).toHaveCount(1);
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  await row.getByRole('link', { name, exact: true }).click();
  await expect(page).toHaveURL(publicPath);
  await expectPublicPage(page, name);
});

test('S04.2 AC12 the address, the API and the photo answer "not found" while the page is pending and the page after approval; another pending page stays "not found"', async ({
  browser,
  page,
}, testInfo) => {
  const name = uniquePageName(testInfo);
  const otherName = uniquePageName(testInfo);
  const slug = expectedSlug(name);
  const otherSlug = expectedSlug(otherName);

  const contributor = await apiContributor(testInfo);
  let submission;
  let other;
  try {
    submission = await contributor.submit(name);
    other = await contributor.submit(otherName);
  } finally {
    await contributor.dispose();
  }

  const anonymous = await anonymousContext(browser, page);
  try {
    const visitor = await anonymous.newPage();

    // While pending: all three are "not found".
    await visitor.goto(`/instruments/${slug}`);
    await expect(visitor.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
    await expect(visitor.getByText(name)).toHaveCount(0);
    expect((await anonymous.request.get(`/api/instruments/${slug}`)).status()).toBe(404);
    expect((await anonymous.request.get(`/api/photos/${submission.photoId}`)).status()).toBe(404);

    // After approval: the page and its photo.
    expect(await approveThroughApi(submission.id)).toBe(slug);
    await visitor.goto(`/instruments/${slug}`);
    await expectPublicPage(visitor, name);
    await expect(visitor.getByRole('img', { name: `Photo of ${name}` })).toBeVisible();
    const api = await anonymous.request.get(`/api/instruments/${slug}`);
    expect(api.status()).toBe(200);
    expect(((await api.json()) as { slug: string }).slug).toBe(slug);
    const photo = await anonymous.request.get(`/api/photos/${submission.photoId}`);
    expect(photo.status()).toBe(200);
    expect(photo.headers()['content-type']).toContain('image/jpeg');

    // The other page, still pending, and its photo stay "not found".
    await visitor.goto(`/instruments/${otherSlug}`);
    await expect(visitor.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();
    expect((await anonymous.request.get(`/api/instruments/${otherSlug}`)).status()).toBe(404);
    expect((await anonymous.request.get(`/api/photos/${other.photoId}`)).status()).toBe(404);
  } finally {
    await anonymous.close();
  }
});

/** True when the whole box of `locator` lies inside the first screen of `width` × `height`. */
async function isOnFirstScreen(locator: Locator, width: number, height: number) {
  const box = await locator.boundingBox();
  if (box === null) return false;
  return box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height;
}

test('S04.2 AC7 at 375 × 812 the hazard level, the training, four hazards, four PPE items and the emergency number are on the first screen, and nothing scrolls sideways', async ({
  browser,
}, testInfo) => {
  const name = uniquePageName(testInfo);
  const contributor = await apiContributor(testInfo);
  let submission;
  try {
    submission = await contributor.submit(name, {
      hazards: ['ELECTRICAL', 'HOT_SURFACE', 'VACUUM', 'MOVING_PARTS'],
      protectiveEquipment: [
        'SAFETY_GLASSES',
        'LAB_COAT',
        'HEAT_RESISTANT_GLOVES',
        'CLOSED_TOE_SHOES',
      ],
    });
  } finally {
    await contributor.dispose();
  }
  const slug = await approveThroughApi(submission.id);

  // Its own phone-sized context, whatever this project's width.
  const width = 375;
  const height = 812;
  const phone = await browser.newContext({
    viewport: { width, height },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const visitor = await phone.newPage();
    await visitor.goto(`/instruments/${slug}`);
    await expectPublicPage(visitor, name);

    const glance = visitor.getByRole('region', { name: 'At a glance', exact: true });
    const hazards = glance.getByRole('list', { name: 'Hazards' });
    const equipment = glance.getByRole('list', { name: 'Protective equipment' });
    await expect(hazards.getByRole('listitem')).toHaveCount(4);
    await expect(equipment.getByRole('listitem')).toHaveCount(4);

    const essentials: Locator[] = [
      glance.getByText('Hazard level: Medium', { exact: true }),
      glance.getByText('Training required before first use: Yes, given by Dr. Lee', {
        exact: true,
      }),
      ...['Electrical', 'Hot surface / heat', 'Vacuum / implosion', 'Moving or rotating parts'].map(
        (label) => hazards.getByText(label, { exact: true }),
      ),
      ...['Safety glasses', 'Lab coat', 'Heat-resistant gloves', 'Closed-toe shoes'].map((label) =>
        equipment.getByText(label, { exact: true }),
      ),
      glance.getByRole('link', { name: '112', exact: true }),
    ];
    for (const element of essentials) {
      await expect(element).toBeVisible();
      expect(await isOnFirstScreen(element, width, height)).toBe(true);
    }
    expect(await hasNoHorizontalScroll(visitor)).toBe(true);
  } finally {
    await phone.close();
  }
});

test('S04.2 AC13 an admin submits a page from the contributor area, approves it from "Pages to review", and the public page names them as the approver', async ({
  page,
}, testInfo) => {
  const name = uniquePageName(testInfo);

  await logInAsAdmin(page);
  const today = await todayInBrowser(page);
  await submitCompletePage(page, name);

  await openReviewQueue(page);
  await expect(
    reviewRow(page, name).getByText(`Submitted by ${TEST_ADMIN.name}`, { exact: true }),
  ).toBeVisible();
  await openReviewSubmission(page, name);
  const publicPath = await approveFromPreview(page, name);
  expect(publicPath).toBe(`/instruments/${expectedSlug(name)}`);

  await page.getByRole('link', { name: 'Open the public page' }).click();
  await expect(page).toHaveURL(publicPath);
  await expectPublicPage(page, name);
  await expect(
    page.getByText(`Last approved ${today} by ${TEST_ADMIN.name}`, { exact: true }),
  ).toBeVisible();
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});
