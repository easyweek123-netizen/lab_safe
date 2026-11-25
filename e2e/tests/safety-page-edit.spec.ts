/**
 * The S03.2 journey in the browser: an approved contributor submits a "Rotary evaporator" page,
 * opens it from My submissions, finds the form filled in with what was submitted, changes the
 * description and saves; the page is still pending and shows the new description when opened
 * again; and an anonymous visitor still finds neither the page nor its photo. Runs in the
 * `desktop` (1280 × 800) and `mobile` (375 × 812) projects with a fresh account per test.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectContributorArea, hasNoHorizontalScroll, signUpApproved } from '../helpers/accounts';
import {
  fillCompletePage,
  openNewSafetyPage,
  openSubmission,
  ROTAVAP_NAME,
} from '../helpers/safety-page';

const NEW_DESCRIPTION = 'Removes solvents gently under reduced pressure and low heat.';

function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true });
}

function emergencyItem(page: Page, name: string) {
  return page.getByRole('group', { name, exact: true });
}

test('S03.2 AC1 AC2 AC7 AC8 submit → open from My submissions → filled in → change the description → save → still pending → reopen shows it → anonymous gets "not found"', async ({
  browser,
  page,
}, testInfo) => {
  // An approved contributor, in their existing session, submits a complete page.
  await signUpApproved(browser, page, testInfo);
  await page.reload();
  await expect(page).toHaveURL('/contribute');
  await expectContributorArea(page);

  await openNewSafetyPage(page);
  const photoId = await fillCompletePage(page);
  const labRoomId = await field(page, 'Lab room').inputValue();
  const categoryValue = await field(page, 'Category').inputValue();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page).toHaveURL('/contribute');
  await expect(page.getByRole('status')).toHaveText(
    `${ROTAVAP_NAME} was submitted and is waiting for review.`,
  );

  // AC1: the name in My submissions opens the edit form, filled in with what was submitted.
  const submissionId = await openSubmission(page, ROTAVAP_NAME);
  expect(page.url()).toContain(`/contribute/submissions/${submissionId}`);

  await expect(field(page, 'Name')).toHaveValue(ROTAVAP_NAME);
  await expect(page.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
    'src',
    new RegExp(`/api/photos/${photoId}$`),
  );
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible();
  await expect(field(page, 'Manufacturer (optional)')).toHaveValue('Büchi');
  await expect(field(page, 'Category')).toHaveValue(categoryValue);
  await expect(field(page, 'Lab room')).toHaveValue(labRoomId);
  await expect(field(page, 'Short description')).toHaveValue(
    'Removes solvents under reduced pressure.',
  );
  await expect(field(page, "Responsible person's name")).toHaveValue('Dr. Lee');
  await expect(field(page, "Responsible person's contact")).toHaveValue('lee@lab.test');

  await expect(page.getByRole('radio', { name: 'Medium', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Yes', exact: true })).toBeChecked();
  await expect(field(page, 'Who gives the training')).toHaveValue('Dr. Lee');

  await expect(
    page.getByRole('checkbox', { name: 'Hot surface / heat', exact: true }),
  ).toBeChecked();
  await expect(field(page, 'How does the Hot surface / heat hazard arise?')).toHaveValue(
    'The water bath reaches 90 °C.',
  );
  await expect(page.getByRole('checkbox', { name: 'Flammable', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Safety glasses', exact: true })).toBeChecked();

  await expect(field(page, 'Before use')).toHaveValue('Check the glassware for cracks.');
  await expect(field(page, 'Safe operation')).toHaveValue('Start the rotation before the vacuum.');
  await expect(field(page, 'Do NOT')).toHaveValue('Do not heat a closed system.');
  await expect(field(page, 'Emergency & first aid')).toHaveValue(
    'Stop the bath, vent the system and call for help.',
  );
  await expect(field(page, 'Emergency phone number')).toHaveValue('112');

  await expect(
    page.getByRole('textbox', { name: 'Where is the eyewash?', exact: true }),
  ).toHaveValue('Next to the door');
  await expect(
    page.getByRole('textbox', { name: 'Where is the first-aid kit?', exact: true }),
  ).toHaveValue('On the wall by the door');
  await expect(
    emergencyItem(page, 'Eyewash').getByRole('checkbox', { name: 'Not applicable', exact: true }),
  ).not.toBeChecked();
  await expect(
    emergencyItem(page, 'Emergency stop').getByRole('checkbox', {
      name: 'Not applicable',
      exact: true,
    }),
  ).toBeChecked();

  // AC8: the edit form does not scroll sideways.
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // AC2: change the description and save; hold the PUT so "Saving…" can be seen while it is sent.
  await field(page, 'Short description').fill(NEW_DESCRIPTION);

  let releaseSave: () => void = () => undefined;
  const saveHeld = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  await page.route(`**/api/submissions/${submissionId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      await saveHeld;
    }
    await route.continue();
  });

  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  releaseSave();

  await expect(page).toHaveURL('/contribute');
  await expect(page.getByRole('status')).toHaveText(
    `Your changes to ${ROTAVAP_NAME} were saved. It is still waiting for review.`,
  );
  const rows = page.getByRole('list', { name: 'My submissions' }).getByRole('listitem');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByText('Status: Pending', { exact: true })).toBeVisible();
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // AC2: opening the page again shows the new description; the rest is as submitted.
  await page.unroute(`**/api/submissions/${submissionId}`);
  await openSubmission(page, ROTAVAP_NAME);
  await expect(field(page, 'Short description')).toHaveValue(NEW_DESCRIPTION);
  await expect(field(page, 'Name')).toHaveValue(ROTAVAP_NAME);
  await expect(page.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
    'src',
    new RegExp(`/api/photos/${photoId}$`),
  );
  await expect(
    emergencyItem(page, 'Emergency stop').getByRole('checkbox', {
      name: 'Not applicable',
      exact: true,
    }),
  ).toBeChecked();
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // AC7: an anonymous visitor in a fresh browser context finds neither the page nor its photo.
  const anonymousContext = await browser.newContext();
  try {
    const anonymous = await anonymousContext.newPage();
    await anonymous.goto('/instruments/rotary-evaporator');
    await expect(
      anonymous.getByRole('heading', { name: 'Page not found', level: 1 }),
    ).toBeVisible();

    const photo = await anonymous.request.get(`/api/photos/${photoId}`);
    expect(photo.status()).toBe(404);
    expect(await photo.json()).toMatchObject({ code: 'NOT_FOUND' });

    const instrument = await anonymous.request.get('/api/instruments/rotary-evaporator');
    expect(instrument.status()).toBe(404);
  } finally {
    await anonymousContext.close();
  }
});
