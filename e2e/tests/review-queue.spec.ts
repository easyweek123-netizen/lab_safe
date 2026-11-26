/**
 * The S04.1 journey in the browser: an approved contributor submits a page with a name of its own,
 * the setup admin finds it in "Pages to review" with "New", the contributor and today's date,
 * opens it and sees the contributor, the date and every filled-in field as `SafetyPageView` shows
 * them; neither page scrolls sideways. An approved contributor, also the page's own author, sees
 * "No access" at both addresses, and an anonymous visitor is sent to log in. Runs in the `desktop`
 * (1280 × 800) and `mobile` (375 × 812) projects with fresh accounts and page names per test.
 */
import { expect, test, type Page } from '@playwright/test';
import {
  banner,
  expectContributorArea,
  hasNoHorizontalScroll,
  logInAsAdmin,
  signUpApproved,
} from '../helpers/accounts';
import {
  openReviewQueue,
  openReviewSubmission,
  reviewRow,
  todayInBrowser,
  uniquePageName,
} from '../helpers/review';
import { fillCompletePage, openNewSafetyPage, openSubmission } from '../helpers/safety-page';

function region(page: Page, name: string) {
  return page.getByRole('region', { name, exact: true });
}

/** Submits a complete page called `name` from `/contribute`; returns the chosen lab room label. */
async function submitPage(page: Page, name: string): Promise<string> {
  await openNewSafetyPage(page);
  await fillCompletePage(page, name);
  const labRoom = await page
    .getByLabel('Lab room', { exact: true })
    .locator('option:checked')
    .innerText();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page).toHaveURL('/contribute');
  await expect(page.getByRole('status')).toHaveText(
    `${name} was submitted and is waiting for review.`,
  );
  return labRoom.trim();
}

test('S04.1 AC1 AC4 AC9 a contributor submits → the admin finds it in "Pages to review" → opens it → the preview shows the contributor, the date and every field', async ({
  browser,
  page,
}, testInfo) => {
  const name = uniquePageName(testInfo);

  // A new approved contributor, in their existing session, submits a complete page.
  const contributor = await signUpApproved(browser, page, testInfo);
  await page.reload();
  await expect(page).toHaveURL('/contribute');
  await expectContributorArea(page);
  const labRoom = await submitPage(page, name);

  // The setup admin logs in in the same window, so the checks run at this project's width.
  await banner(page).getByRole('button', { name: 'Log out' }).click();
  await expect(banner(page).getByRole('link', { name: 'Log in' })).toBeVisible();
  await logInAsAdmin(page);
  const today = await todayInBrowser(page);

  // AC1: the row shows the name as a link, "New", the contributor and today's date.
  await openReviewQueue(page);
  const row = reviewRow(page, name);
  await expect(row).toHaveCount(1);
  await expect(row.getByText('New', { exact: true })).toBeVisible();
  await expect(row.getByText(`Submitted by ${contributor.name}`, { exact: true })).toBeVisible();
  await expect(row).toContainText(`Submitted ${today}`);
  // AC9: "Pages to review" does not scroll sideways.
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // AC4: the preview shows the contributor, the date and the page as SafetyPageView shows it.
  const id = await openReviewSubmission(page, name);
  expect(page.url()).toContain(`/admin/review/${id}`);
  await expect(page.getByText(`Submitted by ${contributor.name} on ${today}`)).toBeVisible();
  await expect(page.getByRole('img', { name: `Photo of ${name}` })).toBeVisible();
  await expect(page.getByText('Manufacturer: Büchi', { exact: true })).toBeVisible();

  const glance = region(page, 'At a glance');
  await expect(glance.getByText('Hazard level: Medium', { exact: true })).toBeVisible();
  await expect(
    glance.getByText('Training required before first use: Yes, given by Dr. Lee', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(glance.getByRole('list', { name: 'Hazards' })).toContainText('Hot surface / heat');
  await expect(glance.getByRole('list', { name: 'Protective equipment' })).toContainText(
    'Safety glasses',
  );
  await expect(glance).toContainText('Emergency: 112');

  await expect(page.getByText('Separation & evaporation', { exact: true })).toBeVisible();
  await expect(page.getByText(labRoom, { exact: true })).toBeVisible();
  await expect(
    page.getByText('Removes solvents under reduced pressure.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('lee@lab.test', { exact: true })).toBeVisible();

  const hazards = region(page, 'Hazards');
  await expect(hazards.getByText('Hot surface / heat', { exact: true })).toBeVisible();
  await expect(hazards.getByText('The water bath reaches 90 °C.', { exact: true })).toBeVisible();
  // The GHS pictogram, its name next to a decorative symbol.
  await expect(
    region(page, 'GHS pictograms').getByText('Flammable', { exact: true }),
  ).toBeVisible();
  await expect(
    region(page, 'Protective equipment').getByText('Safety glasses', { exact: true }),
  ).toBeVisible();

  await expect(region(page, 'Before use')).toContainText('Check the glassware for cracks.');
  await expect(region(page, 'Safe operation')).toContainText(
    'Start the rotation before the vacuum.',
  );
  await expect(region(page, 'Do NOT')).toContainText('Do not heat a closed system.');

  const emergency = region(page, 'Emergency & first aid');
  await expect(emergency).toContainText('Emergency phone number: 112');
  const equipment = emergency.getByRole('list', { name: 'Emergency equipment' });
  await expect(equipment.getByRole('listitem')).toHaveCount(6);
  await expect(equipment).toContainText('Eyewash: Next to the door');
  await expect(equipment).toContainText('Safety shower: Corridor, room 1.02');
  await expect(equipment).toContainText('Fire extinguisher: Left of the fume hood');
  await expect(equipment).toContainText('Spill kit: Under the sink');
  await expect(equipment).toContainText('First-aid kit: On the wall by the door');
  await expect(equipment).toContainText('Emergency stop: Not applicable');
  await expect(emergency).toContainText('Stop the bath, vent the system and call for help.');

  // AC4: never approved, so no "Last approved" line; and no Approve or Reject yet.
  await expect(page.getByText(/Last approved/)).toHaveCount(0);
  // AC9: the preview does not scroll sideways.
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('S04.1 AC8 an approved contributor, also the page\'s own author, sees "No access" at /admin/review and /admin/review/<id>; an anonymous visitor is sent to log in', async ({
  browser,
  page,
}, testInfo) => {
  const name = uniquePageName(testInfo);

  await signUpApproved(browser, page, testInfo);
  await page.reload();
  await expect(page).toHaveURL('/contribute');
  await expectContributorArea(page);
  await submitPage(page, name);
  const id = await openSubmission(page, name);

  // No "Pages to review" link in the contributor's header.
  await expect(banner(page).getByRole('link', { name: 'Pages to review' })).toHaveCount(0);

  await page.goto('/admin/review');
  await expect(page.getByRole('heading', { name: 'No access', level: 1 })).toBeVisible();
  await expect(page).toHaveURL('/admin/review');
  await expect(page.getByText(name)).toHaveCount(0);
  await expect(banner(page).getByRole('link', { name: 'Pages to review' })).toHaveCount(0);
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  await page.goto(`/admin/review/${id}`);
  await expect(page.getByRole('heading', { name: 'No access', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(`/admin/review/${id}`);
  await expect(page.getByText(name)).toHaveCount(0);
  await expect(page.getByText('Removes solvents under reduced pressure.')).toHaveCount(0);
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // An anonymous visitor in a fresh browser context is sent to log in.
  const anonymousContext = await browser.newContext();
  try {
    const anonymous = await anonymousContext.newPage();
    await anonymous.goto(`/admin/review/${id}`);
    await expect(anonymous).toHaveURL(`/login?next=/admin/review/${id}`);
    await expect(anonymous.getByRole('heading', { name: 'Log in', level: 1 })).toBeVisible();
    await expect(anonymous.getByText(name)).toHaveCount(0);
  } finally {
    await anonymousContext.close();
  }
});
