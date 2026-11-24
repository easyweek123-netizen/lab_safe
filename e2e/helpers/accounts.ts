/**
 * Shared steps of the account journeys (S02.1, S02.2, S02.3): a unique person per test, sign up, log in,
 * the setup admin from `test-env.ts`, the review of one sign-up on `/admin/sign-ups`, and a role
 * change on `/admin/accounts`.
 */
import { expect, type Browser, type Page, type TestInfo } from '@playwright/test';
import { TEST_ADMIN } from '../test-env';

const PASSWORD = 'correct-horse-battery';

export type Account = { name: string; email: string; password: string };

/** A unique account per test and project, so tests never share a row in `labsafe_test`. */
export function newAccount(testInfo: TestInfo): Account {
  const id = `${testInfo.project.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { name: `Sara ${id}`, email: `sara-${id}@lab.test`, password: PASSWORD };
}

/** True when the page is no wider than the window (NFR2: no horizontal scrolling). */
export function hasNoHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

export function banner(page: Page) {
  return page.getByRole('banner');
}

/** Opens `/signup` and submits the form; the caller checks where it lands. */
export async function signUp(page: Page, account: Account) {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Sign up', level: 1 })).toBeVisible();
  await page.getByLabel('Name').fill(account.name);
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign up' }).click();
}

/** Fills the login form that is already shown. */
export async function logIn(page: Page, email: string, password: string) {
  await expect(page.getByRole('heading', { name: 'Log in', level: 1 })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

export async function expectWaitingNotice(page: Page) {
  await expect(page).toHaveURL('/contribute');
  await expect(page.getByRole('heading', { name: 'Waiting for approval', level: 1 })).toBeVisible();
  await expect(page.getByText('Your account is waiting for approval.')).toBeVisible();
}

export async function expectContributorArea(page: Page) {
  await expect(page.getByRole('heading', { name: 'Contributor area', level: 1 })).toBeVisible();
  await expect(page.getByText('Here you will write and update safety pages.')).toBeVisible();
}

/** Signs a new person up in `page` and waits for the waiting notice. */
export async function signUpPending(page: Page, testInfo: TestInfo): Promise<Account> {
  const account = newAccount(testInfo);
  await signUp(page, account);
  await expectWaitingNotice(page);
  return account;
}

/** Logs the setup admin (`TEST_ADMIN`) in at `/login`; an admin lands on the contributor area. */
export async function logInAsAdmin(page: Page) {
  await page.goto('/login');
  await logIn(page, TEST_ADMIN.email, TEST_ADMIN.password);
  await expect(page).toHaveURL('/contribute');
  await expect(banner(page).getByText(TEST_ADMIN.name)).toBeVisible();
}

/** Follows the header's "Sign-ups" link to the list of pending sign-ups. */
export async function openSignUps(page: Page) {
  await banner(page).getByRole('link', { name: 'Sign-ups' }).click();
  await expect(page).toHaveURL('/admin/sign-ups');
  await expect(page.getByRole('heading', { name: 'Sign-ups', level: 1 })).toBeVisible();
}

/** The row of one pending sign-up; other tests' sign-ups may be listed too. */
export function signUpRow(page: Page, account: Account) {
  return page
    .getByRole('list', { name: 'Pending sign-ups' })
    .getByRole('listitem')
    .filter({ hasText: account.email });
}

/** Follows the header's "Accounts" link to the list of approved accounts (S02.3). */
export async function openAccounts(page: Page) {
  await banner(page).getByRole('link', { name: 'Accounts' }).click();
  await expect(page).toHaveURL('/admin/accounts');
  await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
}

/** The row of one approved account; other tests' accounts may be listed too. */
export function accountRow(page: Page, account: Account) {
  return page
    .getByRole('list', { name: 'Approved accounts' })
    .getByRole('listitem')
    .filter({ hasText: account.email });
}

export type RoleAction = 'Make admin' | 'Remove admin';

/**
 * Presses "Make admin" or "Remove admin" on `account`'s row of `/admin/accounts` (already open
 * in `page`) and waits for the message and the row's new role.
 */
export async function changeRole(page: Page, account: Account, action: RoleAction) {
  const row = accountRow(page, account);
  await row.getByRole('button', { name: `${action} ${account.name}` }).click();
  const promoted = action === 'Make admin';
  await expect(page.getByRole('status')).toHaveText(
    promoted ? `${account.name} is now an admin.` : `${account.name} is now a contributor.`,
  );
  await expect(
    row.getByText(promoted ? 'Role: Admin' : 'Role: Contributor', { exact: true }),
  ).toBeVisible();
  await expect(
    row.getByRole('button', {
      name: `${promoted ? 'Remove admin' : 'Make admin'} ${account.name}`,
    }),
  ).toBeVisible();
}

/**
 * Changes `account`'s role as the setup admin in a browser context of its own, so the person's
 * session is never touched (used to leave the shared database with one admin after a test).
 */
export async function changeRoleAsSetupAdmin(
  browser: Browser,
  account: Account,
  action: RoleAction,
) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await logInAsAdmin(page);
    await openAccounts(page);
    await changeRole(page, account, action);
  } finally {
    await context.close();
  }
}

/** Signs a new person up in `page`, approves them as the setup admin and returns the account. */
export async function signUpApproved(
  browser: Browser,
  page: Page,
  testInfo: TestInfo,
): Promise<Account> {
  const account = await signUpPending(page, testInfo);
  await approveAsSetupAdmin(browser, account);
  return account;
}

/**
 * Approves `account` as the setup admin in a browser context of its own, so the person's
 * session is never touched.
 */
export async function approveAsSetupAdmin(browser: Browser, account: Account) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await logInAsAdmin(page);
    await openSignUps(page);
    await signUpRow(page, account).getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByRole('status')).toHaveText(`Approved ${account.name}.`);
    await expect(signUpRow(page, account)).toHaveCount(0);
  } finally {
    await context.close();
  }
}
