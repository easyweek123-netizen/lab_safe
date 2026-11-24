/**
 * The S02.1 journey in the browser: sign up → waiting notice → log out → log in, the account gate
 * on `/contribute`, the session cookie, and no sideways scroll on the account pages. Every test
 * runs in the `desktop` (1280 × 800) and `mobile` (375 × 812) projects with its own email.
 */
import { expect, test } from '@playwright/test';
import { TEST_BASE_URL } from '../test-env';
import {
  approveAsSetupAdmin,
  banner,
  expectContributorArea,
  expectWaitingNotice,
  hasNoHorizontalScroll,
  logIn,
  newAccount,
  signUp,
  signUpPending,
} from '../helpers/accounts';

test('S02.1 AC1 AC8 sign-up shows the waiting notice on /contribute, also after reload', async ({
  page,
}, testInfo) => {
  await signUp(page, newAccount(testInfo));

  await expectWaitingNotice(page);
  await page.reload();
  await expectWaitingNotice(page);
});

test('S02.1 AC17 sign-up → waiting notice → log out → log in shows the name in the header', async ({
  page,
}, testInfo) => {
  const account = newAccount(testInfo);
  await signUp(page, account);
  await expectWaitingNotice(page);
  await expect(banner(page).getByText(account.name)).toBeVisible();

  await banner(page).getByRole('button', { name: 'Log out' }).click();
  await expect(banner(page).getByRole('link', { name: 'Log in' })).toBeVisible();
  await expect(banner(page).getByText(account.name)).toBeHidden();

  await banner(page).getByRole('link', { name: 'Log in' }).click();
  // The email in another letter case still logs in (AC5).
  await logIn(page, account.email.toUpperCase(), account.password);

  await expectWaitingNotice(page);
  await expect(banner(page).getByText(account.name)).toBeVisible();
  await expect(banner(page).getByRole('button', { name: 'Log out' })).toBeVisible();
});

test('S02.1 AC9 an anonymous visitor on /contribute logs in and lands on /contribute', async ({
  page,
}, testInfo) => {
  const account = newAccount(testInfo);
  await signUp(page, account);
  await expectWaitingNotice(page);
  await banner(page).getByRole('button', { name: 'Log out' }).click();
  await expect(banner(page).getByRole('link', { name: 'Log in' })).toBeVisible();

  await page.goto('/contribute');
  await expect(page).toHaveURL('/login?next=/contribute');
  await logIn(page, account.email, account.password);

  await expectWaitingNotice(page);
});

test('S02.1 AC9 a next value that is not a local path is ignored', async ({ page }, testInfo) => {
  const account = newAccount(testInfo);
  await signUp(page, account);
  await expectWaitingNotice(page);
  await banner(page).getByRole('button', { name: 'Log out' }).click();
  await expect(banner(page).getByRole('link', { name: 'Log in' })).toBeVisible();

  await page.goto(`/login?next=${encodeURIComponent('//evil.example')}`);
  await logIn(page, account.email, account.password);

  await expectWaitingNotice(page);
});

test('S02.1 AC14 no cookie while anonymous, one labsafe_session cookie after login, one origin', async ({
  page,
  context,
}, testInfo) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'LabSafe', level: 1 })).toBeVisible();
  await expect(banner(page).getByRole('link', { name: 'Log in' })).toBeVisible();
  expect(await context.cookies()).toEqual([]);

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in', level: 1 })).toBeVisible();
  expect(await context.cookies()).toEqual([]);

  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Sign up', level: 1 })).toBeVisible();
  expect(await context.cookies()).toEqual([]);

  // Sign up, log out, and log in again: login sets the cookie that is checked.
  const account = newAccount(testInfo);
  await signUp(page, account);
  await expectWaitingNotice(page);
  await banner(page).getByRole('button', { name: 'Log out' }).click();
  await expect(banner(page).getByRole('link', { name: 'Log in' })).toBeVisible();
  expect(await context.cookies()).toEqual([]);
  await page.goto('/login');
  await logIn(page, account.email, account.password);
  await expectWaitingNotice(page);

  const cookies = await context.cookies();
  expect(cookies).toHaveLength(1);
  expect(cookies[0]).toMatchObject({
    name: 'labsafe_session',
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
  });
  expect([...origins]).toEqual([TEST_BASE_URL]);
});

test('S02.1 AC17 /signup has no horizontal scroll', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Sign up', level: 1 })).toBeVisible();

  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('S02.1 AC17 /login has no horizontal scroll', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in', level: 1 })).toBeVisible();

  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('S02.1 AC17 the waiting notice has no horizontal scroll', async ({ page }, testInfo) => {
  await signUp(page, newAccount(testInfo));
  await expectWaitingNotice(page);

  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('S02.1 AC17 the contributor area has no horizontal scroll', async ({
  browser,
  page,
}, testInfo) => {
  // A real account, approved by the setup admin in its own browser context (S02.1 review F3).
  const account = await signUpPending(page, testInfo);
  await approveAsSetupAdmin(browser, account);

  await page.goto('/contribute');
  await expectContributorArea(page);

  expect(await hasNoHorizontalScroll(page)).toBe(true);
});
