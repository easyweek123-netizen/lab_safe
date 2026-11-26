import { HAZARD_LEVELS } from '@labsafe/shared';
import { onlineManager } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import {
  adminUser,
  approvedUser,
  errorResponse,
  meHandler,
  photoFixture,
  PHOTOS,
  rotavapContent,
  rotavapSubmission,
  server,
  SUBMISSIONS,
} from '../../test/msw';
import { renderApp } from '../../test/render';

const SUMMARY_HEADING = "Your page can't be submitted yet. Fix these fields:";

/** Signs in `user` and answers the photo upload; returns the bodies `POST /api/submissions` got. */
function setUp(user = approvedUser) {
  const submitted: unknown[] = [];
  server.use(
    meHandler(user),
    http.post(PHOTOS, () => HttpResponse.json(photoFixture, { status: 201 })),
    http.post(SUBMISSIONS, async ({ request }) => {
      submitted.push(await request.json());
      return HttpResponse.json(rotavapSubmission, { status: 201 });
    }),
  );
  return submitted;
}

/** Answers `POST /api/submissions` with `response`, counting the requests. */
function submitAnswers(response: () => Response | Promise<Response>) {
  const seen: unknown[] = [];
  server.use(
    http.post(SUBMISSIONS, async ({ request }) => {
      seen.push(await request.json());
      return response();
    }),
  );
  return seen;
}

async function openForm() {
  const app = renderApp('/contribute/new');
  await screen.findByRole('heading', { level: 1, name: 'New safety page' });
  await screen.findByRole('button', { name: 'Submit for review' });
  return app;
}

function location(path: string) {
  return screen.getByRole('textbox', { name: path });
}

/** Fills in the whole form with `rotavapContent`, as a contributor would. */
async function fillCompletePage(user: UserEvent) {
  await user.type(screen.getByLabelText('Name'), rotavapContent.name);
  await user.upload(
    screen.getByLabelText('Photo'),
    new File([new Uint8Array(2048)], 'rotavap.jpg', { type: 'image/jpeg' }),
  );
  await screen.findByRole('button', { name: 'Change photo' });
  await user.type(screen.getByLabelText('Manufacturer (optional)'), 'Büchi');
  await user.selectOptions(
    screen.getByLabelText('Category'),
    screen.getByRole('option', { name: 'Separation & evaporation' }),
  );
  await user.selectOptions(screen.getByLabelText('Lab room'), 'Teaching lab 1 (LAB-101)');
  await user.type(screen.getByLabelText('Short description'), rotavapContent.description);
  await user.type(screen.getByLabelText("Responsible person's name"), 'Dr. Lee');
  await user.type(screen.getByLabelText("Responsible person's contact"), 'lee@lab.test');
  await user.click(screen.getByRole('radio', { name: 'Medium' }));
  await user.click(screen.getByRole('radio', { name: 'Yes' }));
  await user.type(screen.getByLabelText('Who gives the training'), 'Dr. Lee');
  await user.click(screen.getByRole('checkbox', { name: 'Hot surface / heat' }));
  await user.type(
    screen.getByLabelText('How does the Hot surface / heat hazard arise?'),
    'The water bath reaches 90 °C.',
  );
  await user.click(screen.getByRole('checkbox', { name: 'Flammable' }));
  await user.click(screen.getByRole('checkbox', { name: 'Safety glasses' }));
  await user.type(screen.getByLabelText('Before use'), rotavapContent.beforeUse);
  await user.type(screen.getByLabelText('Safe operation'), rotavapContent.safeOperation);
  await user.type(screen.getByLabelText('Do NOT'), rotavapContent.doNot);
  await user.type(screen.getByLabelText('Emergency & first aid'), rotavapContent.emergency);
  await user.type(screen.getByLabelText('Emergency phone number'), '112');
  await user.type(location('Where is the eyewash?'), 'Next to the door');
  await user.type(location('Where is the safety shower?'), 'Corridor, room 1.02');
  await user.type(location('Where is the fire extinguisher?'), 'Left of the fume hood');
  await user.type(location('Where is the spill kit?'), 'Under the sink');
  await user.type(location('Where is the first-aid kit?'), 'On the wall by the door');
  await user.click(
    within(screen.getByRole('group', { name: 'Emergency stop' })).getByRole('checkbox', {
      name: 'Not applicable',
    }),
  );
}

async function pressSubmit(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Submit for review' }));
}

/** The error summary's lines, as the contributor reads them. */
async function summaryLines(): Promise<string[]> {
  const summary = await screen.findByRole('alert');
  expect(summary).toHaveTextContent(SUMMARY_HEADING);
  return within(summary)
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('NewSafetyPagePage', { timeout: 30_000 }, () => {
  it('S03.1 AC1 opens "New safety page" from the contributor area with the five groups in order', async () => {
    setUp();
    const { user, router } = renderApp('/contribute');

    await user.click(await screen.findByRole('link', { name: 'New safety page' }));

    expect(router.state.location.pathname).toBe('/contribute/new');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'New safety page' }),
    ).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Submit for review' });
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Identity',
      'Risk at a glance',
      'Hazards and protection',
      'Guidelines',
      'Emergency info',
    ]);
    expect(
      screen
        .getAllByRole('textbox')
        .map((input) => input.getAttribute('id'))
        .filter((id) =>
          ['page-beforeUse', 'page-safeOperation', 'page-doNot', 'page-emergency'].includes(
            id ?? '',
          ),
        ),
    ).toEqual(['page-beforeUse', 'page-safeOperation', 'page-doNot', 'page-emergency']);
    expect(
      screen.getAllByRole('radio').filter((r) => r.getAttribute('name') === 'hazardLevel'),
    ).toHaveLength(HAZARD_LEVELS.length);
    expect(
      screen.getByText('Minor risk with standard lab PPE.', { exact: false }),
    ).toBeInTheDocument();
    // No last-approved date and no approver: the signed-in name "Anna Approved" is the only match.
    const form = screen.getByRole('button', { name: 'Submit for review' }).closest('form');
    expect(form).not.toBeNull();
    expect(within(form as HTMLFormElement).queryByText(/approv/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/approv/i)).not.toBeInTheDocument();
  });

  it('S03.1 AC1 shows the form to an admin as well', async () => {
    setUp(adminUser);
    await openForm();

    expect(screen.getByRole('group', { name: 'Identity' })).toBeInTheDocument();
  });

  it('S03.1 AC8 sends the complete page, shows "Submitting…" and goes to /contribute with the confirmation', async () => {
    setUp();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const sent = submitAnswers(async () => {
      await gate;
      return HttpResponse.json(rotavapSubmission, { status: 201 });
    });
    const { user, router } = await openForm();
    await fillCompletePage(user);

    await pressSubmit(user);

    expect(await screen.findByRole('button', { name: 'Submitting…' })).toBeDisabled();
    release();
    await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
    expect(router.state.location.state).toEqual({
      confirmation: 'Rotary evaporator was submitted and is waiting for review.',
    });
    expect(sent).toEqual([rotavapContent]);
  });

  it('S03.1 AC9 refuses the empty form without sending it and lists every missing field', async () => {
    setUp();
    const sent = submitAnswers(() => HttpResponse.json(rotavapSubmission, { status: 201 }));
    const { user } = await openForm();
    // A text of only spaces counts as missing.
    await user.type(screen.getByLabelText('Name'), '   ');

    await pressSubmit(user);

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveFocus();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(
      within(summary)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      'Name',
      'Photo',
      'Category',
      'Lab room',
      'Short description',
      "Responsible person's name",
      "Responsible person's contact",
      'Hazard level',
      'Training required before first use',
      'Hazards',
      'Personal protective equipment (PPE)',
      'Before use',
      'Safe operation',
      'Do NOT',
      'Emergency & first aid',
      'Emergency phone number',
      'Eyewash',
      'Safety shower',
      'Fire extinguisher',
      'Spill kit',
      'First-aid kit',
      'Emergency stop',
    ]);
    expect(await summaryLines()).toContain("Name: Enter the instrument's name");
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(
      "Enter the instrument's name",
    );
    expect(screen.getByLabelText('Before use')).toHaveAccessibleDescription(
      'Training, inspection, PPE, ventilation, setup Fill in Before use',
    );
    expect(location('Where is the spill kit?')).toHaveAccessibleDescription(
      "Give a location or choose 'Not applicable'",
    );
    expect(sent).toEqual([]);
  });

  it('S03.1 AC9 moves focus to the input when its link in the summary is followed', async () => {
    setUp();
    const { user } = await openForm();
    await pressSubmit(user);
    const summary = await screen.findByRole('alert');

    await user.click(within(summary).getByRole('link', { name: 'Short description' }));
    expect(screen.getByLabelText('Short description')).toHaveFocus();

    await user.click(within(summary).getByRole('link', { name: 'Spill kit' }));
    expect(location('Where is the spill kit?')).toHaveFocus();
  });

  it("S03.1 AC9 shows the server's fields in the summary and next to their inputs", async () => {
    setUp();
    submitAnswers(() =>
      HttpResponse.json(
        {
          statusCode: 400,
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          fields: [
            { path: 'photoId', message: 'Upload a photo' },
            { path: 'labRoomId', message: 'Choose a lab room' },
          ],
        },
        { status: 400 },
      ),
    );
    const { user } = await openForm();
    await fillCompletePage(user);

    await pressSubmit(user);

    expect(await summaryLines()).toEqual(['Photo: Upload a photo', 'Lab room: Choose a lab room']);
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByLabelText('Lab room')).toHaveAccessibleDescription('Choose a lab room');
    expect(screen.getByText('Upload a photo', { selector: 'p' })).toBeInTheDocument();
  });

  it('S04.4 AC2 moves focus to "Change photo" when "Photo" is followed with a photo shown', async () => {
    setUp();
    submitAnswers(() =>
      HttpResponse.json(
        {
          statusCode: 400,
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          fields: [{ path: 'photoId', message: 'Upload a photo' }],
        },
        { status: 400 },
      ),
    );
    const { user } = await openForm();
    await fillCompletePage(user);
    await pressSubmit(user);
    const summary = await screen.findByRole('alert');

    await user.click(within(summary).getByRole('link', { name: 'Photo' }));

    const change = screen.getByRole('button', { name: 'Change photo' });
    expect(change).toHaveFocus();
    expect(change).toHaveAccessibleDescription('JPEG or PNG, at most 5 MB Upload a photo');
  });

  it('S04.4 AC2 moves focus to the file input when "Photo" is followed with no photo shown', async () => {
    setUp();
    const { user } = await openForm();
    await pressSubmit(user);
    const summary = await screen.findByRole('alert');

    await user.click(within(summary).getByRole('link', { name: 'Photo' }));

    expect(screen.getByLabelText('Photo')).toHaveFocus();
  });

  it('S04.4 AC3 shows only the photo message after an offline submit and a refused photo', async () => {
    setUp();
    submitAnswers(() => HttpResponse.error());
    const { user } = await openForm();
    await fillCompletePage(user);
    onlineManager.setOnline(false);
    await pressSubmit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    onlineManager.setOnline(true);
    server.use(
      http.post(PHOTOS, () =>
        errorResponse(415, 'PHOTO_TYPE', 'Only JPEG or PNG photos are accepted.'),
      ),
    );
    await user.upload(
      screen.getByLabelText('Photo'),
      new File([new Uint8Array(2048)], 'report.pdf.jpg', { type: 'image/jpeg' }),
    );

    expect(await screen.findByText('Only JPEG or PNG photos are accepted.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toBeInTheDocument();
  });

  it('S04.4 AC3 clears the old failure alert when the new photo uploads', async () => {
    setUp();
    submitAnswers(() => HttpResponse.error());
    const { user } = await openForm();
    await fillCompletePage(user);
    onlineManager.setOnline(false);
    await pressSubmit(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    onlineManager.setOnline(true);
    await user.upload(
      screen.getByLabelText('Photo'),
      new File([new Uint8Array(2048)], 'better.jpg', { type: 'image/jpeg' }),
    );

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeEnabled();
  });

  it('S04.4 AC4 says "try again" when submitting fails offline', async () => {
    setUp();
    submitAnswers(() => HttpResponse.error());
    const { user } = await openForm();
    await fillCompletePage(user);
    onlineManager.setOnline(false);

    await pressSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't reach LabSafe. Your page is still here; check your connection and try again.",
    );
  });

  it('S04.4 AC4 says "try again here" when submitting gets a 401', async () => {
    setUp();
    submitAnswers(() => errorResponse(401, 'UNAUTHENTICATED', 'Log in first'));
    const { user } = await openForm();
    await fillCompletePage(user);

    await pressSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your session has ended. Log in again in another tab, then try again here.',
    );
  });

  it('S04.4 AC4 says "try again here" when a photo upload gets a 401', async () => {
    setUp();
    server.use(http.post(PHOTOS, () => errorResponse(401, 'UNAUTHENTICATED', 'Log in first')));
    const { user } = await openForm();

    await user.upload(
      screen.getByLabelText('Photo'),
      new File([new Uint8Array(2048)], 'rotavap.jpg', { type: 'image/jpeg' }),
    );

    expect(
      await screen.findByText(
        'Your session has ended. Log in again in another tab, then try again here.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Photo')).toHaveAccessibleDescription(
      'JPEG or PNG, at most 5 MB Your session has ended. Log in again in another tab, then try again here.',
    );
  });

  it('S03.1 AC10 names exactly the missing note, PPE, emergency location and trainer', async () => {
    setUp();
    const sent = submitAnswers(() => HttpResponse.json(rotavapSubmission, { status: 201 }));
    const { user } = await openForm();
    await fillCompletePage(user);
    await user.clear(screen.getByLabelText('How does the Hot surface / heat hazard arise?'));
    await user.click(screen.getByRole('checkbox', { name: 'Safety glasses' }));
    await user.clear(location('Where is the eyewash?'));
    await user.clear(screen.getByLabelText('Who gives the training'));

    await pressSubmit(user);

    expect(await summaryLines()).toEqual([
      'Who gives the training: Enter who gives the training',
      'How does the Hot surface / heat hazard arise? Describe how this hazard arises',
      "Personal protective equipment (PPE): Choose at least one PPE item, or 'No PPE beyond standard lab attire'",
      "Eyewash: Give a location or choose 'Not applicable'",
    ]);
    expect(sent).toEqual([]);
  });

  it('S03.1 AC10 names only Hazards when no hazard type and no "No significant hazards" is chosen', async () => {
    setUp();
    const { user } = await openForm();
    await fillCompletePage(user);
    await user.click(screen.getByRole('checkbox', { name: 'Hot surface / heat' }));

    await pressSubmit(user);

    expect(await summaryLines()).toEqual([
      "Hazards: Choose at least one hazard, or 'No significant hazards'",
    ]);
  });

  it('S03.1 AC11 refuses hazards with "No significant hazards" and PPE with standard lab attire', async () => {
    setUp();
    const sent = submitAnswers(() => HttpResponse.json(rotavapSubmission, { status: 201 }));
    const { user } = await openForm();
    await fillCompletePage(user);
    await user.click(screen.getByRole('checkbox', { name: 'No significant hazards' }));
    await user.click(screen.getByRole('checkbox', { name: 'No PPE beyond standard lab attire' }));

    await pressSubmit(user);

    expect(await summaryLines()).toEqual([
      "No significant hazards: Choose hazards or 'No significant hazards', not both.",
      "No PPE beyond standard lab attire: Choose PPE items or 'No PPE beyond standard lab attire', not both.",
    ]);
    expect(sent).toEqual([]);
  });

  it('S03.1 AC12 refuses training required with a Low hazard level', async () => {
    setUp();
    const sent = submitAnswers(() => HttpResponse.json(rotavapSubmission, { status: 201 }));
    const { user } = await openForm();
    await fillCompletePage(user);
    await user.click(screen.getByRole('radio', { name: 'Low' }));

    await pressSubmit(user);

    expect(await summaryLines()).toEqual([
      "Hazard level: A page that requires training can't have a Low hazard level.",
    ]);
    expect(screen.getByRole('radiogroup', { name: 'Hazard level' })).toHaveAccessibleDescription(
      "A page that requires training can't have a Low hazard level.",
    );
    expect(sent).toEqual([]);
  });

  it.each([
    [
      'a network error',
      () => HttpResponse.error(),
      "Couldn't reach LabSafe. Your page is still here; check your connection and try again.",
    ],
    [
      'a 500',
      () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error'),
      'Something went wrong on our side. Your page is still here; try again.',
    ],
    [
      'a 401',
      () => errorResponse(401, 'UNAUTHENTICATED', 'Log in first'),
      'Your session has ended. Log in again in another tab, then try again here.',
    ],
    [
      'a 403',
      () => errorResponse(403, 'FORBIDDEN', 'Forbidden'),
      "Your account can't submit pages.",
    ],
  ])('S03.1 AC17 keeps the form and its photo after %s', async (_case, response, message) => {
    setUp();
    const sent = submitAnswers(response);
    const { user, router } = await openForm();
    await fillCompletePage(user);

    await pressSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(sent).toHaveLength(1);
    expect(router.state.location.pathname).toBe('/contribute/new');
    expect(screen.getByRole('heading', { level: 1, name: 'New safety page' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Rotary evaporator');
    expect(screen.getByLabelText('Short description')).toHaveValue(rotavapContent.description);
    expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeEnabled();
  });

  it('S03.1 AC17 sends at once while offline and keeps the form', async () => {
    setUp();
    const sent = submitAnswers(() => HttpResponse.error());
    const { user } = await openForm();
    await fillCompletePage(user);
    onlineManager.setOnline(false);

    await pressSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't reach LabSafe. Your page is still here; check your connection and try again.",
    );
    expect(sent).toHaveLength(1);
    expect(screen.getByLabelText('Name')).toHaveValue('Rotary evaporator');
  });

  it('S03.1 AC18 shows "Loading…" while the lists load', async () => {
    setUp();
    server.use(
      http.get('*/api/meta/lists', async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    renderApp('/contribute/new');

    expect(await screen.findByRole('status')).toHaveTextContent('Loading…');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'New safety page' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
  });

  it('S03.1 AC18 shows "Couldn\'t load the form, try again." with Retry when the lists fail', async () => {
    setUp();
    server.use(
      http.get(
        '*/api/meta/lists',
        () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error'),
        {
          once: true,
        },
      ),
    );
    const { user } = renderApp('/contribute/new');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load the form, try again.",
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('button', { name: 'Submit for review' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
