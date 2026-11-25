/**
 * The S03.1 journey in the browser: an approved contributor writes a "Rotary evaporator" page with
 * a JPEG and submits it; the contributor area shows the confirmation and the row in My
 * submissions; a second approved contributor sees an empty list; and an anonymous visitor finds
 * neither the page nor its photo. Runs in the `desktop` (1280 × 800) and `mobile` (375 × 812)
 * projects with fresh accounts; the page name repeats between runs (E03 open question 5).
 */
import { expect, test } from '@playwright/test';
import { expectContributorArea, hasNoHorizontalScroll, signUpApproved } from '../helpers/accounts';
import { fillCompletePage, openNewSafetyPage, ROTAVAP_NAME } from '../helpers/safety-page';

/** Today's date as the contributor area writes it ("24 Nov 2026"). */
function today(): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date());
}

test('S03.1 AC8 AC16 AC19 AC20 submit "Rotary evaporator" → confirmation and My submissions → another contributor sees none → anonymous gets "not found"', async ({
  browser,
  page,
}, testInfo) => {
  // An approved contributor, in their existing session.
  await signUpApproved(browser, page, testInfo);
  await page.reload();
  await expect(page).toHaveURL('/contribute');
  await expectContributorArea(page);
  await expect(page.getByText("You haven't submitted any pages yet.")).toBeVisible();

  await openNewSafetyPage(page);
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  const photoId = await fillCompletePage(page);
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // Hold the submit for a moment, so "Submitting…" can be seen while it is sent.
  let releaseSubmit: () => void = () => undefined;
  const submitHeld = new Promise<void>((resolve) => {
    releaseSubmit = resolve;
  });
  await page.route('**/api/submissions', async (route) => {
    await submitHeld;
    await route.continue();
  });

  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
  releaseSubmit();

  // AC8: the confirmation and the row in My submissions.
  await expect(page).toHaveURL('/contribute');
  await expect(page.getByRole('status')).toHaveText(
    `${ROTAVAP_NAME} was submitted and is waiting for review.`,
  );
  const rows = page.getByRole('list', { name: 'My submissions' }).getByRole('listitem');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByText(ROTAVAP_NAME, { exact: true })).toBeVisible();
  await expect(rows.first().getByText(`Submitted ${today()}`)).toBeVisible();
  await expect(rows.first().getByText('Status: Pending', { exact: true })).toBeVisible();
  // AC20: the contributor area with a row does not scroll sideways.
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // The owner can still load the stored photo.
  const own = await page.request.get(`/api/photos/${photoId}`);
  expect(own.status()).toBe(200);
  expect(own.headers()['content-type']).toContain('image/jpeg');

  // AC16: a second approved contributor sees only their own (empty) list.
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await signUpApproved(browser, other, testInfo);
    await other.reload();
    await expect(other).toHaveURL('/contribute');
    await expectContributorArea(other);
    await expect(other.getByText("You haven't submitted any pages yet.")).toBeVisible();
    await expect(other.getByText(ROTAVAP_NAME)).toHaveCount(0);
    expect(await hasNoHorizontalScroll(other)).toBe(true);
  } finally {
    await otherContext.close();
  }

  // AC19: an anonymous visitor in a fresh browser context finds neither the page nor its photo.
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
