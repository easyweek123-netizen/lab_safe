/**
 * The S03.3 journey in the browser: an approved contributor half fills in "New safety page", the
 * network drops, the window loses and regains focus, the network comes back, and a refresh of
 * `me` fails with a 500; the form, the typed text and their name in the header stay. Submitting
 * while offline keeps the form with the S03.1 AC17 network message; submitting the complete page
 * online shows the S03.1 confirmation. Runs in the `desktop` and `mobile` projects with a fresh
 * approved account.
 */
import { expect, test, type Page } from '@playwright/test';
import {
  banner,
  expectContributorArea,
  hasNoHorizontalScroll,
  signUpApproved,
} from '../helpers/accounts';
import { fillCompletePage, openNewSafetyPage, ROTAVAP_NAME } from '../helpers/safety-page';

const ME = '**/api/auth/me';
const HALF_NAME = 'Rotary evaporator (draft)';
const HALF_DESCRIPTION = 'Removes solvents under reduced pressure.';

/** The window loses focus and gets it back, as TanStack Query listens for it. */
async function refocusWindow(page: Page) {
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  });
}

async function expectHalfFilledForm(page: Page, name: string) {
  await expect(page.getByRole('heading', { name: 'New safety page', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(HALF_NAME);
  await expect(page.getByLabel('Short description', { exact: true })).toHaveValue(HALF_DESCRIPTION);
  await expect(banner(page).getByText(name, { exact: true })).toBeVisible();
  await expect(banner(page).getByRole('button', { name: 'Log out' })).toBeVisible();
  await expect(banner(page).getByRole('link', { name: 'Log in' })).toHaveCount(0);
  await expect(page.getByText("Couldn't load, try again.")).toHaveCount(0);
}

test('S03.3 AC3 a network drop and a failed refresh keep the half-filled form and the name → offline submit keeps it with the network message → online submit is confirmed', async ({
  browser,
  context,
  page,
}, testInfo) => {
  const account = await signUpApproved(browser, page, testInfo);
  await page.reload();
  await expect(page).toHaveURL('/contribute');
  await expectContributorArea(page);

  await openNewSafetyPage(page);
  await page.getByLabel('Name', { exact: true }).fill(HALF_NAME);
  await page.getByLabel('Short description', { exact: true }).fill(HALF_DESCRIPTION);

  // Offline, focus away and back, online again.
  await context.setOffline(true);
  await refocusWindow(page);
  const reconnectRefresh = page.waitForResponse(ME);
  await context.setOffline(false);
  await refocusWindow(page);
  expect((await reconnectRefresh).status()).toBe(200);
  await expectHalfFilledForm(page, account.name);

  // A background refresh that fails with a 500 (the first try and the app's one retry).
  let failedRefreshes = 0;
  await page.route(ME, async (route) => {
    failedRefreshes += 1;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      }),
    });
  });
  await refocusWindow(page);
  await expect.poll(() => failedRefreshes, { timeout: 15_000 }).toBe(2);
  // Let the failed retry settle into the error state before looking again.
  await page.waitForTimeout(500);
  await expectHalfFilledForm(page, account.name);
  await page.unroute(ME);

  // Complete the page, then submit while offline: the form stays with the network message.
  await fillCompletePage(page);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(
    page.getByText(
      "Couldn't reach LabSafe. Your page is still here; check your connection and try again.",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL('/contribute/new');
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(ROTAVAP_NAME);
  await expect(page.getByRole('img', { name: 'Photo of the instrument' })).toBeVisible();
  await expect(banner(page).getByText(account.name, { exact: true })).toBeVisible();
  expect(await hasNoHorizontalScroll(page)).toBe(true);

  // Online again: the same submit goes through and shows the S03.1 confirmation.
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page).toHaveURL('/contribute');
  await expect(page.getByRole('status')).toHaveText(
    `${ROTAVAP_NAME} was submitted and is waiting for review.`,
  );
  await expect(
    page
      .getByRole('list', { name: 'My submissions' })
      .getByRole('listitem')
      .getByText(ROTAVAP_NAME, { exact: true }),
  ).toBeVisible();
});
