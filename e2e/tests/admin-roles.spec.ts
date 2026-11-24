/**
 * The S02.3 journey in the browser: the setup admin from `test-env.ts` makes an approved person an
 * admin on `/admin/accounts` and removes the role again, and the person sees the result on their
 * next page load without logging in again. Each test uses two browser contexts (the person and
 * the admin) and its own email, and runs in the `desktop` (1280 × 800) and `mobile` (375 × 812)
 * projects. Every test leaves the person a contributor, so the setup admin stays the only admin
 * that other specs see. The last-admin rule (AC5, AC6) is proven by the API and component tests.
 */
import { expect, test } from '@playwright/test';
import { TEST_ADMIN } from '../test-env';
import {
  accountRow,
  approveAsSetupAdmin,
  banner,
  changeRole,
  changeRoleAsSetupAdmin,
  expectContributorArea,
  hasNoHorizontalScroll,
  logIn,
  logInAsAdmin,
  newAccount,
  openAccounts,
  signUp,
  signUpApproved,
  signUpPending,
} from '../helpers/accounts';

test('S02.3 AC3 AC4 AC12 admin makes a person an admin → reload → sign-ups; removes it → reload → "No access"', async ({
  browser,
  page,
}, testInfo) => {
  const account = await signUpApproved(browser, page, testInfo);
  await page.reload();
  await expectContributorArea(page);
  await expect(banner(page).getByRole('link', { name: 'Accounts' })).toBeHidden();

  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  let isAdmin = false;
  try {
    await logInAsAdmin(admin);
    await openAccounts(admin);
    const row = accountRow(admin, account);
    await expect(row.getByText(account.name)).toBeVisible();
    await expect(row.getByText('Role: Contributor', { exact: true })).toBeVisible();
    expect(await hasNoHorizontalScroll(admin)).toBe(true);

    await changeRole(admin, account, 'Make admin');
    isAdmin = true;

    // The person's existing session, no new login.
    await page.reload();
    await expect(banner(page).getByText(account.name)).toBeVisible();
    await expect(banner(page).getByRole('link', { name: 'Sign-ups' })).toBeVisible();
    await expect(banner(page).getByRole('link', { name: 'Accounts' })).toBeVisible();
    await banner(page).getByRole('link', { name: 'Sign-ups' }).click();
    await expect(page).toHaveURL('/admin/sign-ups');
    await expect(page.getByRole('heading', { name: 'Sign-ups', level: 1 })).toBeVisible();

    await changeRole(admin, account, 'Remove admin');
    isAdmin = false;

    await page.reload();
    await expect(page).toHaveURL('/admin/sign-ups');
    await expect(page.getByRole('heading', { name: 'No access', level: 1 })).toBeVisible();
    await expect(banner(page).getByRole('link', { name: 'Sign-ups' })).toBeHidden();
    await expect(banner(page).getByRole('link', { name: 'Accounts' })).toBeHidden();

    await page.goto('/contribute');
    await expectContributorArea(page);
  } finally {
    await adminContext.close();
    // Leave the setup admin as the only admin, even when a step above failed.
    if (isAdmin) {
      await changeRoleAsSetupAdmin(browser, account, 'Remove admin');
    }
  }
});

test('S02.3 AC10 an anonymous visitor on /admin/accounts logs in as admin and lands there', async ({
  page,
}) => {
  await page.goto('/admin/accounts');
  await expect(page).toHaveURL('/login?next=/admin/accounts');

  await logIn(page, TEST_ADMIN.email, TEST_ADMIN.password);

  await expect(page).toHaveURL('/admin/accounts');
  await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
});

test('S02.3 AC10 a pending account on /admin/accounts sees the waiting notice', async ({
  page,
}, testInfo) => {
  await signUpPending(page, testInfo);

  await page.goto('/admin/accounts');

  await expect(page).toHaveURL('/admin/accounts');
  await expect(page.getByRole('heading', { name: 'Waiting for approval', level: 1 })).toBeVisible();
  await expect(banner(page).getByRole('link', { name: 'Accounts' })).toBeHidden();
});

test('S02.3 AC10 AC12 an approved contributor on /admin/accounts sees "No access" without sideways scroll', async ({
  browser,
  page,
}, testInfo) => {
  const account = await signUpApproved(browser, page, testInfo);

  await page.goto('/admin/accounts');

  await expect(page).toHaveURL('/admin/accounts');
  await expect(page.getByRole('heading', { name: 'No access', level: 1 })).toBeVisible();
  await expect(page.getByText("You don't have access to this page.")).toBeVisible();
  await expect(banner(page).getByText(account.name)).toBeVisible();
  await expect(banner(page).getByRole('link', { name: 'Accounts' })).toBeHidden();
  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('S02.3 AC12 /admin/accounts has no horizontal scroll with a long name and email', async ({
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
  await approveAsSetupAdmin(browser, account);

  const adminContext = await browser.newContext();
  try {
    const admin = await adminContext.newPage();
    await logInAsAdmin(admin);
    await openAccounts(admin);
    await expect(accountRow(admin, account)).toBeVisible();

    expect(await hasNoHorizontalScroll(admin)).toBe(true);
  } finally {
    await adminContext.close();
  }
});
