/**
 * Smoke tests of the one-origin test server (S01.3 AC6–AC9). Every test runs in the `desktop`
 * (1280 × 800) and `mobile` (375 × 812) projects against a freshly prepared `labsafe_test`.
 */
import { expect, test, type Page } from '@playwright/test';

/** The placeholder rooms inserted by the `CreateLabRooms` migration, as the home page shows them. */
const FIRST_ROOM = 'LAB-101 · Teaching lab 1';
const LAB_ROOMS = [
  FIRST_ROOM,
  'LAB-102 · Teaching lab 2',
  'LAB-201 · Research lab',
  'LAB-202 · Instrument room',
];

function labRoomsList(page: Page) {
  return page.getByRole('list', { name: 'Lab rooms' });
}

function hazardTypesList(page: Page) {
  return page.getByRole('list', { name: 'Hazard types' });
}

/** True when the page is no wider than the window (NFR2: no horizontal scrolling). */
function hasNoHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

test('TC-6.1 home shows the header, the heading, the four rooms and the hazard types', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('banner').getByRole('link', { name: 'LabSafe' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'LabSafe', level: 1 })).toBeVisible();

  const rooms = labRoomsList(page);
  for (const room of LAB_ROOMS) {
    await expect(rooms.getByRole('listitem').filter({ hasText: room })).toBeVisible();
  }
  await expect(rooms.getByRole('listitem')).toHaveCount(LAB_ROOMS.length);

  const hazardTypes = hazardTypesList(page);
  await expect(hazardTypes.getByRole('listitem').filter({ hasText: 'Electrical' })).toBeVisible();
  await expect(hazardTypes.getByRole('listitem').filter({ hasText: 'Biological' })).toBeVisible();
});

test('TC-7.1 home has no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(labRoomsList(page).getByRole('listitem').first()).toBeVisible();
  await expect(hazardTypesList(page).getByRole('listitem').first()).toBeVisible();

  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('TC-7.2 not-found page has no horizontal scroll', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();

  expect(await hasNoHorizontalScroll(page)).toBe(true);
});

test('TC-8.1 an unknown address shows "Page not found" and its link leads home', async ({
  page,
}) => {
  // Entered directly: the server must answer with the web app, and the client router shows the page.
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found', level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'Go to the home page' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'LabSafe', level: 1 })).toBeVisible();
  await expect(
    labRoomsList(page).getByRole('listitem').filter({ hasText: FIRST_ROOM }),
  ).toBeVisible();
});

test('TC-9.1 the document language is English and the title is "LabSafe"', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('LabSafe');
});
