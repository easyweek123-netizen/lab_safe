/**
 * Shared steps of the safety page journeys (S03.1, S03.2): open the new page form from the
 * contributor area, fill in (and submit) a complete page (named "Rotary evaporator" unless the test gives it
 * a unique name) with the JPEG of `fixtures/instrument.jpg`, and open a submission's edit page
 * from My submissions.
 */
import { resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';

/** A small JPEG (320 × 240) for the photo field. */
export const INSTRUMENT_JPEG = resolve(import.meta.dirname, '../fixtures/instrument.jpg');

export const ROTAVAP_NAME = 'Rotary evaporator';

/** Follows "New safety page" from `/contribute` and waits for the loaded form. */
export async function openNewSafetyPage(page: Page) {
  await page.getByRole('link', { name: 'New safety page' }).click();
  await expect(page).toHaveURL('/contribute/new');
  await expect(page.getByRole('heading', { name: 'New safety page', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit for review' })).toBeVisible();
}

/** The location input of one emergency item, for example "Where is the eyewash?". */
function location(page: Page, label: string) {
  return page.getByRole('textbox', { name: label, exact: true });
}

/**
 * Fills in every required field of the open form with a rotary evaporator page called `name`,
 * uploads the JPEG and returns the id of the stored photo (from the preview's address).
 */
export async function fillCompletePage(page: Page, name: string = ROTAVAP_NAME): Promise<string> {
  await page.getByLabel('Name', { exact: true }).fill(name);

  await page.getByLabel('Photo', { exact: true }).setInputFiles(INSTRUMENT_JPEG);
  const preview = page.getByRole('img', { name: 'Photo of the instrument' });
  await expect(preview).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible();
  const src = await preview.getAttribute('src');
  const photoId = src?.split('/').pop();
  if (!photoId) {
    throw new Error(`The photo preview has no id in its address: ${String(src)}`);
  }

  await page.getByLabel('Manufacturer (optional)', { exact: true }).fill('Büchi');
  await page.getByLabel('Category', { exact: true }).selectOption({
    label: 'Separation & evaporation',
  });
  // The first room of the fixed list (index 0 is the prompt).
  await page.getByLabel('Lab room', { exact: true }).selectOption({ index: 1 });
  await page
    .getByLabel('Short description', { exact: true })
    .fill('Removes solvents under reduced pressure.');
  await page.getByLabel("Responsible person's name", { exact: true }).fill('Dr. Lee');
  await page.getByLabel("Responsible person's contact", { exact: true }).fill('lee@lab.test');

  await page.getByRole('radio', { name: 'Medium', exact: true }).check();
  await page.getByRole('radio', { name: 'Yes', exact: true }).check();
  await page.getByLabel('Who gives the training', { exact: true }).fill('Dr. Lee');

  await page.getByRole('checkbox', { name: 'Hot surface / heat', exact: true }).check();
  await page
    .getByLabel('How does the Hot surface / heat hazard arise?', { exact: true })
    .fill('The water bath reaches 90 °C.');
  await page.getByRole('checkbox', { name: 'Flammable', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Safety glasses', exact: true }).check();

  await page.getByLabel('Before use', { exact: true }).fill('Check the glassware for cracks.');
  await page
    .getByLabel('Safe operation', { exact: true })
    .fill('Start the rotation before the vacuum.');
  await page.getByLabel('Do NOT', { exact: true }).fill('Do not heat a closed system.');
  await page
    .getByLabel('Emergency & first aid', { exact: true })
    .fill('Stop the bath, vent the system and call for help.');
  await page.getByLabel('Emergency phone number', { exact: true }).fill('112');

  await location(page, 'Where is the eyewash?').fill('Next to the door');
  await location(page, 'Where is the safety shower?').fill('Corridor, room 1.02');
  await location(page, 'Where is the fire extinguisher?').fill('Left of the fume hood');
  await location(page, 'Where is the spill kit?').fill('Under the sink');
  await location(page, 'Where is the first-aid kit?').fill('On the wall by the door');
  await page
    .getByRole('group', { name: 'Emergency stop', exact: true })
    .getByRole('checkbox', { name: 'Not applicable', exact: true })
    .check();

  return photoId;
}

/**
 * Follows the name of one submission in My submissions on `/contribute` (S03.2 AC1) and waits for
 * the loaded edit form; returns the submission's id from the address.
 */
export async function openSubmission(page: Page, name: string): Promise<string> {
  await page
    .getByRole('list', { name: 'My submissions' })
    .getByRole('link', { name, exact: true })
    .click();
  await expect(page).toHaveURL(/\/contribute\/submissions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Edit safety page', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  const id = new URL(page.url()).pathname.split('/').pop();
  if (!id) {
    throw new Error(`The edit page has no id in its address: ${page.url()}`);
  }
  return id;
}

/**
 * Opens the new page form from `/contribute`, fills in a complete page called `name`, submits it
 * and waits for the confirmation (S03.1 AC1); returns the id of the stored photo.
 */
export async function submitCompletePage(page: Page, name: string): Promise<string> {
  await openNewSafetyPage(page);
  const photoId = await fillCompletePage(page, name);
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page).toHaveURL('/contribute');
  await expect(page.getByRole('status')).toHaveText(
    `${name} was submitted and is waiting for review.`,
  );
  return photoId;
}
