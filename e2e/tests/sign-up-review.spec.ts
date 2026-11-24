/**
 * The S02.2 journey in the browser: the setup admin from `test-env.ts` reviews sign-ups on
 * `/admin/sign-ups`, and the person sees the result on their next page load without logging in
 * again. Each test uses two browser contexts (the person and the admin) and its own email, and
 * runs in the `desktop` (1280 × 800) and `mobile` (375 × 812) projects.
 */
import { expect, test } from '@playwright/test';
import { TEST_ADMIN } from '../test-env';
import {
  approveAsSetupAdmin,
  banner,
  expectContributorArea,
  hasNoHorizontalScroll,
  logIn,
  logInAsAdmin,
  newAccount,
  openSignUps,
  signUp,
  signUpPending,
  signUpRow,
} from '../helpers/accounts';

test('S02.2 AC3 the setup admin sees "Sign-ups" in the header and reaches /admin/sign-ups', async ({
  page,
}) => {
  await logInAsAdmin(page);

  await openSignUps(page);
});

test('S02.2 AC6 AC12 sign up → admin approves → reload → contributor area', async ({
  browser,
  page,
}, testInfo) => {
  const account = await signUpPending(page, testInfo);

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await logInAsAdmin(admin);
  await openSignUps(admin);
  const row = signUpRow(admin, account);
  await expect(row.getByText(account.name)).toBeVisible();
  await expect(row.getByRole('button', { name: 'Reject' })).toBeVisible();
  expect(await hasNoHorizontalScroll(admin)).toBe(true);

  await row.getByRole('button', { name: 'Approve' }).click();
  await expect(admin.getByRole('status')).toHaveText(`Approved ${account.name}.`);
  await expect(row).toHaveCount(0);
  await adminContext.close();

  // The person's existing session, no new login.
  await page.reload();
  await expect(page).toHaveURL('/contribute');
  await expectContributorArea(page);
  await expect(banner(page).getByText(account.name)).toBeVisible();
});

test('S02.2 AC7 AC12 sign up → admin rejects → reload → not-approved notice', async ({
  browser,
  page,
}, testInfo) => {
  const account = await signUpPending(page, testInfo);

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await logInAsAdmin(admin);
  await openSignUps(admin);
  const row = signUpRow(admin, account);

  // "Cancel" changes nothing.
  await row.getByRole('button', { name: 'Reject' }).click();
  await expect(row.getByText("Reject this sign-up? This can't be undone.")).toBeVisible();
  await row.getByRole('button', { name: 'Cancel' }).click();
  await expect(row.getByRole('button', { name: 'Approve' })).toBeVisible();

  await row.getByRole('button', { name: 'Reject' }).click();
  await row.getByRole('button', { name: 'Yes, reject' }).click();
  await expect(admin.getByRole('status')).toHaveText(`Rejected ${account.name}.`);
  await expect(row).toHaveCount(0);
  await adminContext.close();

  await page.reload();
  await expect(page).toHaveURL('/contribute');
  await expect(page.getByRole('heading', { name: 'Sign-up not approved', level: 1 })).toBeVisible();
  await expect(page.getByText('Your sign-up was not approved.')).toBeVisible();

  // Signing up again with the same email, from a fresh browser.
  const againContext = await browser.newContext();
  const again = await againContext.newPage();
  await signUp(again, { ...account, name: `${account.name} again` });
  await expect(again.getByText('An account with this email already exists')).toBeVisible();
  await expect(again).toHaveURL('/signup');
  await againContext.close();
});

test('S02.2 AC10 an anonymous visitor on /admin/sign-ups logs in as admin and lands there', async ({
  page,
}) => {
  await page.goto('/admin/sign-ups');
  await expect(page).toHaveURL('/login?next=/admin/sign-ups');

  await logIn(page, TEST_ADMIN.email, TEST_ADMIN.password);

  await expect(page).toHaveURL('/admin/sign-ups');
  await expect(page.getByRole('heading', { name: 'Sign-ups', level: 1 })).toBeVisible();
});

test('S02.2 AC10 a pending account on /admin/sign-ups sees the waiting notice', async ({
  page,
}, testInfo) => {
  await signUpPending(page, testInfo);

  await page.goto('/admin/sign-ups');

  await expect(page).toHaveURL('/admin/sign-ups');
  await expect(page.getByRole('heading', { name: 'Waiting for approval', level: 1 })).toBeVisible();
  await expect(banner(page).getByRole('link', { name: 'Sign-ups' })).toBeHidden();
});

test('S02.2 AC10 AC12 an approved contributor sees "No access" without sideways scroll', async ({
  browser,
  page,
}, testInfo) => {
  const account = await signUpPending(page, testInfo);
  await approveAsSetupAdmin(browser, account);

  await page.goto('/admin/sign-ups');

  await expect(page).toHaveURL('/admin/sign-ups');
  await expect(page.getByRole('heading', { name: 'No access', level: 1 })).toBeVisible();
  await expect(page.getByText("You don't have access to this page.")).toBeVisible();
  await expect(banner(page).getByText(account.name)).toBeVisible();
  await expect(banner(page).getByRole('link', { name: 'Sign-ups' })).toBeHidden();
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('S02.2 AC12 /admin/sign-ups has no horizontal scroll with a long name and email', async ({
  browser,
  page,
}, testInfo) => {
  // A long unbroken name and email in the list must wrap, not widen the page.
  const base = newAccount(testInfo);
  const account = {
    ...base,
    name: `${base.name}${'x'.repeat(60)}`,
    email: base.email.replace('@', `${'x'.repeat(20)}@`),
  };
  await signUp(page, account);
  await expect(page).toHaveURL('/contribute');

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await logInAsAdmin(admin);
  await openSignUps(admin);
  await expect(signUpRow(admin, account)).toBeVisible();

  expect(await hasNoHorizontalScroll(admin)).toBe(true);
  await adminContext.close();
});
