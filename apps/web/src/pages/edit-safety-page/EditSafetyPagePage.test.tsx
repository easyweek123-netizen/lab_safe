import { MySubmissions, SafetyPageContent, Submission } from '@labsafe/shared';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';
import {
  adminUser,
  approvedUser,
  errorResponse,
  meHandler,
  mySubmissionsFixture,
  mySubmissionsHandler,
  PHOTOS,
  rotavapContent,
  rotavapSubmission,
  server,
  SUBMISSION,
} from '../../test/msw';
import { renderApp } from '../../test/render';

const PAGE = `/contribute/submissions/${rotavapSubmission.id}`;
const SUMMARY_HEADING = "Your page can't be submitted yet. Fix these fields:";
const NEW_DESCRIPTION = 'Removes solvents under reduced pressure with a water bath.';

/** The 200 answer to a save: still pending, first `submittedAt`, new `updatedAt`. */
function savedSubmission(content: SafetyPageContent): Submission {
  return Submission.parse({
    ...rotavapSubmission,
    updatedAt: '2026-11-25T12:00:00.000Z',
    content,
  });
}

/**
 * Signs in `user`, answers `GET /api/submissions/:id` with `submission` (counting the reads) and
 * `PUT` with `respond` (default: the saved body). Returns the reads and the bodies sent.
 */
function setUp({
  user = approvedUser,
  submission = rotavapSubmission,
  respond,
}: {
  user?: typeof approvedUser;
  submission?: Submission;
  respond?: (body: SafetyPageContent) => Response | Promise<Response>;
} = {}) {
  const reads = { count: 0 };
  const sent: unknown[] = [];
  server.use(
    meHandler(user),
    mySubmissionsHandler(mySubmissionsFixture),
    http.get(SUBMISSION, ({ params }) => {
      if (params.id !== submission.id) {
        return undefined;
      }
      reads.count += 1;
      return HttpResponse.json(submission);
    }),
    http.put(SUBMISSION, async ({ request }) => {
      const body = SafetyPageContent.parse(await request.json());
      sent.push(body);
      return respond ? respond(body) : HttpResponse.json(savedSubmission(body));
    }),
  );
  return { reads, sent };
}

async function openForm(path = PAGE) {
  const app = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: 'Edit safety page' });
  await screen.findByRole('button', { name: 'Save changes' });
  return app;
}

function location(name: string) {
  return screen.getByRole('textbox', { name });
}

function emergencyGroup(name: string) {
  return within(screen.getByRole('group', { name }));
}

async function pressSave(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Save changes' }));
}

async function changeDescription(user: UserEvent, text = NEW_DESCRIPTION) {
  await user.clear(screen.getByLabelText('Short description'));
  await user.type(screen.getByLabelText('Short description'), text);
}

/** `rotavapSubmission` once an admin approved it: published at `rotary-evaporator`. */
const approvedSubmission = Submission.parse({
  ...rotavapSubmission,
  status: 'APPROVED',
  slug: 'rotary-evaporator',
});

const NOTE = 'The photo is blurry; add the waste step to Safe operation.';
const FIX_CONFIRMATION = 'Rotary evaporator was resubmitted and is waiting for review.';
const NEW_SAFE_OPERATION = 'Collect the condensate in the waste bottle before switching off.';

/** `rotavapSubmission` once an admin rejected it with `NOTE`. */
const rejectedSubmission = Submission.parse({
  ...rotavapSubmission,
  status: 'REJECTED',
  reviewNote: NOTE,
});

/** The 200 answer to a resubmission: pending again, a new `submittedAt`, no note. */
function resubmittedSubmission(content: SafetyPageContent): Submission {
  return Submission.parse({
    ...rotavapSubmission,
    status: 'PENDING',
    submittedAt: '2026-11-26T12:00:00.000Z',
    updatedAt: '2026-11-26T12:00:00.000Z',
    reviewNote: null,
    content,
  });
}

async function openFixForm(path = PAGE) {
  const app = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: 'Fix safety page' });
  await screen.findByRole('button', { name: 'Resubmit for review' });
  return app;
}

async function changeSafeOperation(user: UserEvent, text = NEW_SAFE_OPERATION) {
  await user.clear(screen.getByLabelText('Safe operation'));
  await user.type(screen.getByLabelText('Safe operation'), text);
}

afterEach(() => {
  onlineManager.setOnline(true);
  focusManager.setFocused(undefined);
});

describe('EditSafetyPagePage', { timeout: 30_000 }, () => {
  it('S03.2 AC1 opens "Rotary evaporator" from My submissions filled in with what was submitted', async () => {
    setUp();
    const { user, router } = renderApp('/contribute');

    await user.click(await screen.findByRole('link', { name: 'Rotary evaporator' }));

    expect(router.state.location.pathname).toBe(PAGE);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit safety page' }),
    ).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Save changes' });

    expect(screen.getByLabelText('Name')).toHaveValue('Rotary evaporator');
    expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
      'src',
      `/api/photos/${rotavapContent.photoId}`,
    );
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Manufacturer (optional)')).toHaveValue('Büchi');
    expect(screen.getByLabelText('Model (optional)')).toHaveValue('');
    expect(screen.getByLabelText('Category')).toHaveDisplayValue('Separation & evaporation');
    expect(screen.getByLabelText('Lab room')).toHaveDisplayValue('Teaching lab 1 (LAB-101)');
    expect(screen.getByLabelText('Short description')).toHaveValue(rotavapContent.description);
    expect(screen.getByLabelText("Responsible person's name")).toHaveValue('Dr. Lee');
    expect(screen.getByLabelText("Responsible person's contact")).toHaveValue('lee@lab.test');
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Yes' })).toBeChecked();
    expect(screen.getByLabelText('Who gives the training')).toHaveValue('Dr. Lee');
    expect(screen.getByRole('checkbox', { name: 'Hot surface / heat' })).toBeChecked();
    expect(screen.getByLabelText('How does the Hot surface / heat hazard arise?')).toHaveValue(
      'The water bath reaches 90 °C.',
    );
    expect(screen.getByRole('checkbox', { name: 'No significant hazards' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Flammable' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Safety glasses' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'No PPE beyond standard lab attire' }),
    ).not.toBeChecked();
    expect(screen.getByLabelText('Before use')).toHaveValue(rotavapContent.beforeUse);
    expect(screen.getByLabelText('Safe operation')).toHaveValue(rotavapContent.safeOperation);
    expect(screen.getByLabelText('Do NOT')).toHaveValue(rotavapContent.doNot);
    expect(screen.getByLabelText('Emergency & first aid')).toHaveValue(rotavapContent.emergency);
    expect(screen.getByLabelText('Emergency phone number')).toHaveValue('112');
    expect(location('Where is the eyewash?')).toHaveValue('Next to the door');
    expect(location('Where is the safety shower?')).toHaveValue('Corridor, room 1.02');
    expect(location('Where is the fire extinguisher?')).toHaveValue('Left of the fume hood');
    expect(location('Where is the spill kit?')).toHaveValue('Under the sink');
    expect(location('Where is the first-aid kit?')).toHaveValue('On the wall by the door');
    expect(
      emergencyGroup('Eyewash').getByRole('checkbox', { name: 'Not applicable' }),
    ).not.toBeChecked();
    expect(
      emergencyGroup('Emergency stop').getByRole('checkbox', { name: 'Not applicable' }),
    ).toBeChecked();
  });

  it('S03.2 AC1 shows the "none" choices and training "No" as submitted', async () => {
    const content = SafetyPageContent.parse({
      ...rotavapContent,
      hazardLevel: 'LOW',
      trainingRequired: false,
      trainingGivenBy: null,
      hazards: [],
      noSignificantHazards: true,
      pictograms: [],
      protectiveEquipment: [],
      standardLabAttireOnly: true,
    });
    setUp({ submission: Submission.parse({ ...rotavapSubmission, content }) });
    await openForm();

    expect(screen.getByRole('radio', { name: 'Low' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
    expect(screen.queryByLabelText('Who gives the training')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'No significant hazards' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Hot surface / heat' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Flammable' })).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'No PPE beyond standard lab attire' }),
    ).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Safety glasses' })).not.toBeChecked();
  });

  it('S03.2 AC2 sends the changed page, shows "Saving…" and goes to /contribute with the confirmation', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { reads, sent } = setUp({
      respond: async (body) => {
        await gate;
        return HttpResponse.json(savedSubmission(body));
      },
    });
    const { user, router } = await openForm();
    await changeDescription(user);

    await pressSave(user);

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    release();
    await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
    expect(router.state.location.state).toEqual({
      confirmation: 'Your changes to Rotary evaporator were saved. It is still waiting for review.',
    });
    expect(sent).toEqual([{ ...rotavapContent, description: NEW_DESCRIPTION }]);
    expect(
      await screen.findByText(
        'Your changes to Rotary evaporator were saved. It is still waiting for review.',
      ),
    ).toHaveAttribute('role', 'status');
    // The submission was read again after the save (invalidated).
    expect(reads.count).toBe(2);
  });

  it('S03.2 AC2 sends a new photo and a removed hazard', async () => {
    const newPhotoId = '9c4e2a1b-7d3f-4e5a-8b6c-1d2e3f4a5b02';
    const { sent } = setUp();
    server.use(
      http.post(PHOTOS, () =>
        HttpResponse.json({ id: newPhotoId, width: 1600, height: 1200 }, { status: 201 }),
      ),
    );
    const { user, router } = await openForm();
    await user.upload(
      screen.getByLabelText('Photo'),
      new File([new Uint8Array(2048)], 'new.jpg', { type: 'image/jpeg' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
        'src',
        `/api/photos/${newPhotoId}`,
      ),
    );
    await user.click(screen.getByRole('checkbox', { name: 'Hot surface / heat' }));
    await user.click(screen.getByRole('checkbox', { name: 'No significant hazards' }));

    await pressSave(user);

    await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
    expect(sent).toEqual([
      { ...rotavapContent, photoId: newPhotoId, hazards: [], noSignificantHazards: true },
    ]);
  });

  it('S03.2 AC3 refuses a cleared required field with the S03.1 summary and sends nothing', async () => {
    const { sent } = setUp();
    const { user, router } = await openForm();
    await user.clear(screen.getByLabelText('Name'));
    await user.click(screen.getByRole('radio', { name: 'Low' }));

    await pressSave(user);

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(SUMMARY_HEADING);
    expect(summary).toHaveFocus();
    expect(
      within(summary)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      "Name: Enter the instrument's name",
      "Hazard level: A page that requires training can't have a Low hazard level.",
    ]);
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(
      "Enter the instrument's name",
    );
    expect(sent).toEqual([]);
    expect(router.state.location.pathname).toBe(PAGE);
  });

  it("S03.2 AC3 shows the server's fields in the summary and next to their inputs", async () => {
    setUp({
      respond: () =>
        HttpResponse.json(
          {
            statusCode: 400,
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            fields: [{ path: 'labRoomId', message: 'Choose a lab room' }],
          },
          { status: 400 },
        ),
    });
    const { user } = await openForm();

    await pressSave(user);

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(SUMMARY_HEADING);
    expect(within(summary).getByRole('listitem')).toHaveTextContent('Lab room: Choose a lab room');
    expect(screen.getByLabelText('Lab room')).toHaveAccessibleDescription('Choose a lab room');
  });

  it('S03.2 AC6 shows status "Loading…" while the submission loads', async () => {
    server.use(
      meHandler(approvedUser),
      http.get(SUBMISSION, async () => {
        await delay('infinite');
        return HttpResponse.json(rotavapSubmission);
      }),
    );
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit safety page' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('S03.2 AC6 shows "Page not found" for an unknown id', async () => {
    server.use(
      meHandler(approvedUser),
      http.get(SUBMISSION, () => errorResponse(404, 'NOT_FOUND', 'Not found')),
    );
    renderApp('/contribute/submissions/3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1eff');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The page you are looking for does not exist.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Edit safety page' })).not.toBeInTheDocument();
  });

  it('S03.2 AC6 shows "Page not found" for a malformed id without asking the server', async () => {
    let reads = 0;
    server.use(
      meHandler(approvedUser),
      http.get(SUBMISSION, () => {
        reads += 1;
        return errorResponse(400, 'VALIDATION_FAILED', 'Validation failed');
      }),
    );
    renderApp('/contribute/submissions/not-a-uuid');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(reads).toBe(0);
  });

  it('S03.2 AC6 shows "Page not found" for a 400 from the server', async () => {
    server.use(
      meHandler(approvedUser),
      http.get(SUBMISSION, () => errorResponse(400, 'VALIDATION_FAILED', 'Validation failed')),
    );
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
  });

  it('S03.2 AC6 shows "Page not found" to an admin who isn\'t the author', async () => {
    setUp({ user: adminUser });
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('S03.2 AC6 shows "Couldn\'t load this page, try again." and Retry loads the form', async () => {
    let calls = 0;
    server.use(
      meHandler(approvedUser),
      http.get(SUBMISSION, () => {
        calls += 1;
        return calls === 1
          ? errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')
          : HttpResponse.json(rotavapSubmission);
      }),
    );
    const { user } = renderApp(PAGE);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load this page, try again.",
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Edit safety page' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Rotary evaporator');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('S03.2 AC6 shows the load error when the lists fail', async () => {
    setUp();
    server.use(
      http.get('*/api/meta/lists', () =>
        errorResponse(500, 'INTERNAL_ERROR', 'Internal server error'),
      ),
    );
    renderApp(PAGE);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load this page, try again.",
    );
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
  ])(
    'S03.2 AC6 keeps every typed value after a save fails with %s',
    async (_case, response, message) => {
      const { sent } = setUp({ respond: response });
      const { user, router } = await openForm();
      await changeDescription(user);

      await pressSave(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(sent).toHaveLength(1);
      expect(router.state.location.pathname).toBe(PAGE);
      expect(
        screen.getByRole('heading', { level: 1, name: 'Edit safety page' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Short description')).toHaveValue(NEW_DESCRIPTION);
      expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    },
  );

  it('S03.2 AC6 sends at once while offline and keeps the form', async () => {
    const { sent } = setUp({ respond: () => HttpResponse.error() });
    const { user } = await openForm();
    await changeDescription(user);
    onlineManager.setOnline(false);

    await pressSave(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't reach LabSafe. Your page is still here; check your connection and try again.",
    );
    expect(sent).toHaveLength(1);
    expect(screen.getByLabelText('Short description')).toHaveValue(NEW_DESCRIPTION);
  });

  it.each([
    ['fails', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')],
    [
      'answers other content',
      () =>
        HttpResponse.json(
          Submission.parse({
            ...rotavapSubmission,
            content: { ...rotavapContent, description: 'Changed elsewhere.' },
          }),
        ),
    ],
  ])('S03.2 AC6 keeps what was typed when a background refresh %s', async (_case, refresh) => {
    setUp();
    let refreshes = 0;
    const { user } = await openForm();
    server.use(
      http.get(SUBMISSION, () => {
        refreshes += 1;
        return refresh();
      }),
    );
    await changeDescription(user);

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() => expect(refreshes).toBe(1));
    // Let the refresh settle and the page render again.
    await act(() => delay(50));
    expect(screen.getByLabelText('Short description')).toHaveValue(NEW_DESCRIPTION);
    expect(screen.getByLabelText('Name')).toHaveValue('Rotary evaporator');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('S03.2 AC6 keeps the form after a background refresh answers "not found"', async () => {
    setUp();
    const { user } = await openForm();
    server.use(http.get(SUBMISSION, () => errorResponse(404, 'NOT_FOUND', 'Not found')));
    await changeDescription(user);

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await act(() => delay(50));
    expect(screen.getByRole('heading', { level: 1, name: 'Edit safety page' })).toBeInTheDocument();
    expect(screen.getByLabelText('Short description')).toHaveValue(NEW_DESCRIPTION);
  });

  it('S04.2 AC10 shows "This page was approved and can\'t be changed here." with the public link and no form', async () => {
    setUp({ submission: approvedSubmission });
    renderApp(PAGE);

    expect(
      await screen.findByText("This page was approved and can't be changed here."),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Edit safety page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the public page' })).toHaveAttribute(
      'href',
      '/instruments/rotary-evaporator',
    );
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('S04.2 AC10 shows "This page has already been reviewed." on saving a page approved meanwhile, and keeps the form', async () => {
    const { sent } = setUp({
      respond: () => errorResponse(409, 'ALREADY_REVIEWED', 'This page has already been reviewed.'),
    });
    const { user, router } = await openForm();
    await changeDescription(user);

    await pressSave(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This page has already been reviewed.',
    );
    expect(sent).toHaveLength(1);
    expect(router.state.location.pathname).toBe(PAGE);
    expect(screen.getByLabelText('Short description')).toHaveValue(NEW_DESCRIPTION);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('S04.2 AC10 keeps the open form when a background refresh answers the page approved', async () => {
    setUp();
    const { user } = await openForm();
    server.use(http.get(SUBMISSION, () => HttpResponse.json(approvedSubmission)));
    await changeDescription(user);

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await act(() => delay(50));
    expect(screen.getByLabelText('Short description')).toHaveValue(NEW_DESCRIPTION);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    expect(
      screen.queryByText("This page was approved and can't be changed here."),
    ).not.toBeInTheDocument();
  });

  it('S04.3 AC5 opens the rejected page from My submissions as "Fix safety page" with the note above the filled form', async () => {
    setUp({ submission: rejectedSubmission });
    server.use(
      mySubmissionsHandler(
        MySubmissions.parse({
          submissions: [
            { ...mySubmissionsFixture.submissions[0], status: 'REJECTED', reviewNote: NOTE },
          ],
        }),
      ),
    );
    const { user, router } = renderApp('/contribute');

    await user.click(await screen.findByRole('link', { name: 'Rotary evaporator' }));

    expect(router.state.location.pathname).toBe(PAGE);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Fix safety page' }),
    ).toBeInTheDocument();
    const submit = await screen.findByRole('button', { name: 'Resubmit for review' });
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Edit safety page' })).not.toBeInTheDocument();

    // The note: a heading and the text, before the form.
    const noteHeading = screen.getByRole('heading', { level: 2, name: "Admin's note" });
    const noteText = screen.getByText(NOTE);
    const firstField = screen.getByLabelText('Name');
    expect(
      noteHeading.compareDocumentPosition(noteText) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      noteText.compareDocumentPosition(firstField) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(noteText).not.toHaveAttribute('role', 'alert');

    // Filled in with exactly what was submitted.
    expect(firstField).toHaveValue('Rotary evaporator');
    expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
      'src',
      `/api/photos/${rotavapContent.photoId}`,
    );
    expect(screen.getByLabelText('Short description')).toHaveValue(rotavapContent.description);
    expect(screen.getByLabelText('Safe operation')).toHaveValue(rotavapContent.safeOperation);
    expect(screen.getByRole('checkbox', { name: 'Hot surface / heat' })).toBeChecked();
    expect(location('Where is the eyewash?')).toHaveValue('Next to the door');
    expect(submit).toBeEnabled();
  });

  it('S04.3 AC5 keeps the line breaks of the note', async () => {
    const note = 'The photo is blurry.\nAdd the waste step to Safe operation.';
    setUp({ submission: Submission.parse({ ...rejectedSubmission, reviewNote: note }) });
    await openFixForm();

    const shown = screen.getByText(/^The photo is blurry\./);
    expect(shown.textContent).toBe(note);
    expect(shown).toHaveClass('whitespace-pre-wrap');
  });

  it('S04.3 AC6 sends the fixed page, shows "Resubmitting…" and goes to /contribute with the confirmation', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const newPhotoId = '9c4e2a1b-7d3f-4e5a-8b6c-1d2e3f4a5b02';
    const { reads, sent } = setUp({
      submission: rejectedSubmission,
      respond: async (body) => {
        await gate;
        return HttpResponse.json(resubmittedSubmission(body));
      },
    });
    server.use(
      http.post(PHOTOS, () =>
        HttpResponse.json({ id: newPhotoId, width: 1600, height: 1200 }, { status: 201 }),
      ),
    );
    const { user, router } = await openFixForm();
    await user.upload(
      screen.getByLabelText('Photo'),
      new File([new Uint8Array(2048)], 'sharp.jpg', { type: 'image/jpeg' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
        'src',
        `/api/photos/${newPhotoId}`,
      ),
    );
    await changeSafeOperation(user);

    await user.click(screen.getByRole('button', { name: 'Resubmit for review' }));

    expect(await screen.findByRole('button', { name: 'Resubmitting…' })).toBeDisabled();
    release();
    await waitFor(() => expect(router.state.location.pathname).toBe('/contribute'));
    expect(router.state.location.state).toEqual({ confirmation: FIX_CONFIRMATION });
    expect(sent).toEqual([
      { ...rotavapContent, photoId: newPhotoId, safeOperation: NEW_SAFE_OPERATION },
    ]);
    expect(await screen.findByText(FIX_CONFIRMATION)).toHaveAttribute('role', 'status');
    // The submission was read again after the resubmission (invalidated).
    expect(reads.count).toBe(2);
  });

  it('S04.3 AC7 refuses a cleared required field with the S03.1 summary and sends nothing', async () => {
    const { sent } = setUp({ submission: rejectedSubmission });
    const { user, router } = await openFixForm();
    await user.clear(screen.getByLabelText('Safe operation'));

    await user.click(screen.getByRole('button', { name: 'Resubmit for review' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(SUMMARY_HEADING);
    expect(summary).toHaveFocus();
    expect(
      within(summary)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Safe operation: Fill in Safe operation']);
    expect(screen.getByLabelText('Safe operation')).toHaveAccessibleDescription(
      expect.stringContaining('Fill in Safe operation'),
    );
    expect(sent).toEqual([]);
    expect(router.state.location.pathname).toBe(PAGE);
    // The page is still the fix form with the note.
    expect(screen.getByRole('heading', { level: 1, name: 'Fix safety page' })).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });

  it("S04.3 AC7 shows the server's fields in the summary and next to their inputs", async () => {
    setUp({
      submission: rejectedSubmission,
      respond: () =>
        HttpResponse.json(
          {
            statusCode: 400,
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            fields: [{ path: 'labRoomId', message: 'Choose a lab room' }],
          },
          { status: 400 },
        ),
    });
    const { user, router } = await openFixForm();

    await user.click(screen.getByRole('button', { name: 'Resubmit for review' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(SUMMARY_HEADING);
    expect(within(summary).getByRole('listitem')).toHaveTextContent('Lab room: Choose a lab room');
    expect(screen.getByLabelText('Lab room')).toHaveAccessibleDescription('Choose a lab room');
    expect(router.state.location.pathname).toBe(PAGE);
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resubmit for review' })).toBeEnabled();
  });

  it('S04.4 AC1 announces a refused photo on "Change photo" in the fix form and keeps the old photo', async () => {
    setUp({ submission: rejectedSubmission });
    server.use(
      http.post(PHOTOS, () =>
        errorResponse(415, 'PHOTO_TYPE', 'Only JPEG or PNG photos are accepted.'),
      ),
    );
    const { user } = await openFixForm();
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeEmptyDOMElement();

    await user.upload(
      screen.getByLabelText('Photo'),
      new File([new Uint8Array(2048)], 'report.pdf.jpg', { type: 'image/jpeg' }),
    );

    const message = await screen.findByText('Only JPEG or PNG photos are accepted.');
    expect(liveRegion).toContainElement(message);
    expect(screen.getByRole('button', { name: 'Change photo' })).toHaveAccessibleDescription(
      'JPEG or PNG, at most 5 MB Only JPEG or PNG photos are accepted.',
    );
    expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
      'src',
      `/api/photos/${rotavapContent.photoId}`,
    );
  });

  it('S04.4 AC1 describes "Change photo" with the message in the edit form', async () => {
    setUp();
    server.use(
      http.post(PHOTOS, () =>
        errorResponse(415, 'PHOTO_TYPE', 'Only JPEG or PNG photos are accepted.'),
      ),
    );
    const { user } = await openForm();

    await user.upload(
      screen.getByLabelText('Photo'),
      new File([new Uint8Array(2048)], 'report.pdf.jpg', { type: 'image/jpeg' }),
    );

    await screen.findByText('Only JPEG or PNG photos are accepted.');
    expect(screen.getByRole('button', { name: 'Change photo' })).toHaveAccessibleDescription(
      'JPEG or PNG, at most 5 MB Only JPEG or PNG photos are accepted.',
    );
  });

  it('S04.4 AC2 moves focus to "Change photo" when "Photo" is followed in the fix form', async () => {
    setUp({
      submission: rejectedSubmission,
      respond: () =>
        HttpResponse.json(
          {
            statusCode: 400,
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            fields: [{ path: 'photoId', message: 'Upload a photo' }],
          },
          { status: 400 },
        ),
    });
    const { user } = await openFixForm();
    await user.click(screen.getByRole('button', { name: 'Resubmit for review' }));
    const summary = await screen.findByRole('alert');

    await user.click(within(summary).getByRole('link', { name: 'Photo' }));

    expect(screen.getByRole('button', { name: 'Change photo' })).toHaveFocus();
  });

  it('S04.4 AC3 shows only the photo message after an offline resubmit and a refused photo', async () => {
    setUp({ submission: rejectedSubmission, respond: () => HttpResponse.error() });
    const { user } = await openFixForm();
    onlineManager.setOnline(false);
    await user.click(screen.getByRole('button', { name: 'Resubmit for review' }));
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
  });

  it('S04.4 AC3 clears the old failure alert when a new photo uploads in the edit form', async () => {
    const newPhotoId = '9c4e2a1b-7d3f-4e5a-8b6c-1d2e3f4a5b02';
    setUp({ respond: () => HttpResponse.error() });
    server.use(
      http.post(PHOTOS, () =>
        HttpResponse.json({ id: newPhotoId, width: 1600, height: 1200 }, { status: 201 }),
      ),
    );
    const { user } = await openForm();
    onlineManager.setOnline(false);
    await pressSave(user);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    onlineManager.setOnline(true);
    await user.upload(
      screen.getByLabelText('Photo'),
      new File([new Uint8Array(2048)], 'better.jpg', { type: 'image/jpeg' }),
    );

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
        'src',
        `/api/photos/${newPhotoId}`,
      ),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['edit', 'Save changes'],
    ['fix', 'Resubmit for review'],
  ])('S04.4 AC4 says "try again" when the %s form fails offline', async (form, button) => {
    setUp({
      submission: form === 'fix' ? rejectedSubmission : rotavapSubmission,
      respond: () => HttpResponse.error(),
    });
    const { user } = form === 'fix' ? await openFixForm() : await openForm();
    onlineManager.setOnline(false);

    await user.click(screen.getByRole('button', { name: button }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't reach LabSafe. Your page is still here; check your connection and try again.",
    );
  });

  it.each([
    ['edit', 'Save changes'],
    ['fix', 'Resubmit for review'],
  ])('S04.4 AC4 says "try again here" when the %s form gets a 401', async (form, button) => {
    setUp({
      submission: form === 'fix' ? rejectedSubmission : rotavapSubmission,
      respond: () => errorResponse(401, 'UNAUTHENTICATED', 'Log in first'),
    });
    const { user } = form === 'fix' ? await openFixForm() : await openForm();

    await user.click(screen.getByRole('button', { name: button }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your session has ended. Log in again in another tab, then try again here.',
    );
  });

  it.each(['edit', 'fix'])(
    'S04.4 AC4 says "try again here" when a photo upload in the %s form gets a 401',
    async (form) => {
      setUp({ submission: form === 'fix' ? rejectedSubmission : rotavapSubmission });
      server.use(http.post(PHOTOS, () => errorResponse(401, 'UNAUTHENTICATED', 'Log in first')));
      const { user } = form === 'fix' ? await openFixForm() : await openForm();

      await user.upload(
        screen.getByLabelText('Photo'),
        new File([new Uint8Array(2048)], 'better.jpg', { type: 'image/jpeg' }),
      );

      expect(
        await screen.findByText(
          'Your session has ended. Log in again in another tab, then try again here.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Change photo' })).toHaveAccessibleDescription(
        'JPEG or PNG, at most 5 MB Your session has ended. Log in again in another tab, then try again here.',
      );
    },
  );

  it('S04.3 AC10 shows status "Loading…" while the rejected page loads', async () => {
    server.use(
      meHandler(approvedUser),
      http.get(SUBMISSION, async () => {
        await delay('infinite');
        return HttpResponse.json(rejectedSubmission);
      }),
    );
    renderApp(PAGE);

    // The h1 may read "Edit safety page" until the submission has loaded (FE-02).
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edit safety page' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resubmit for review' })).not.toBeInTheDocument();
  });

  it('S04.3 AC10 shows "Page not found" for someone else\'s rejected page', async () => {
    server.use(
      meHandler(approvedUser),
      http.get(SUBMISSION, () => errorResponse(404, 'NOT_FOUND', 'Not found')),
    );
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it('S04.3 AC10 shows "Page not found" to an admin who isn\'t the author, without the note', async () => {
    setUp({ user: adminUser, submission: rejectedSubmission });
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resubmit for review' })).not.toBeInTheDocument();
  });

  it('S04.3 AC10 shows "Couldn\'t load this page, try again." and Retry loads the fix form', async () => {
    let calls = 0;
    server.use(
      meHandler(approvedUser),
      http.get(SUBMISSION, () => {
        calls += 1;
        return calls === 1
          ? errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')
          : HttpResponse.json(rejectedSubmission);
      }),
    );
    const { user } = renderApp(PAGE);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load this page, try again.",
    );

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('button', { name: 'Resubmit for review' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Fix safety page' })).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls).toBe(2);
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
      'a 409',
      () => errorResponse(409, 'ALREADY_REVIEWED', 'This page has already been reviewed.'),
      'This page has already been reviewed.',
    ],
  ])(
    'S04.3 AC10 keeps every typed value after a resubmission fails with %s',
    async (_case, response, message) => {
      const { sent } = setUp({ submission: rejectedSubmission, respond: response });
      const { user, router } = await openFixForm();
      await changeSafeOperation(user);

      await user.click(screen.getByRole('button', { name: 'Resubmit for review' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(sent).toHaveLength(1);
      expect(router.state.location.pathname).toBe(PAGE);
      expect(
        screen.getByRole('heading', { level: 1, name: 'Fix safety page' }),
      ).toBeInTheDocument();
      expect(screen.getByText(NOTE)).toBeInTheDocument();
      expect(screen.getByLabelText('Safe operation')).toHaveValue(NEW_SAFE_OPERATION);
      expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Resubmit for review' })).toBeEnabled();
    },
  );

  it.each([
    ['fails', () => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error'), true],
    ['answers "not found"', () => errorResponse(404, 'NOT_FOUND', 'Not found'), true],
    [
      'answers other content',
      () =>
        HttpResponse.json(
          Submission.parse({
            ...rejectedSubmission,
            content: { ...rotavapContent, safeOperation: 'Changed elsewhere.' },
          }),
        ),
      true,
    ],
    // Resubmitted or approved elsewhere: the server has no note any more, the form stays.
    [
      'answers the page pending again',
      () => HttpResponse.json(resubmittedSubmission(rotavapContent)),
      false,
    ],
    ['answers the page approved', () => HttpResponse.json(approvedSubmission), false],
  ])(
    'S04.3 AC10 keeps the fix form and what was typed when a background refresh %s',
    async (_case, refresh, noteStays) => {
      setUp({ submission: rejectedSubmission });
      let refreshes = 0;
      const { user } = await openFixForm();
      server.use(
        http.get(SUBMISSION, () => {
          refreshes += 1;
          return refresh();
        }),
      );
      await changeSafeOperation(user);

      act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
      });

      await waitFor(() => expect(refreshes).toBe(1));
      await act(() => delay(50));
      expect(
        screen.getByRole('heading', { level: 1, name: 'Fix safety page' }),
      ).toBeInTheDocument();
      expect(screen.queryByText(NOTE) !== null).toBe(noteStays);
      expect(screen.getByLabelText('Safe operation')).toHaveValue(NEW_SAFE_OPERATION);
      expect(screen.getByRole('button', { name: 'Resubmit for review' })).toBeEnabled();
      expect(
        screen.queryByText("This page was approved and can't be changed here."),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    },
  );

  it('S04.3 AC10 keeps the pending edit form unchanged when a background refresh answers the page rejected', async () => {
    setUp();
    const { user } = await openForm();
    server.use(http.get(SUBMISSION, () => HttpResponse.json(rejectedSubmission)));
    await changeDescription(user);

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await act(() => delay(50));
    expect(screen.getByRole('heading', { level: 1, name: 'Edit safety page' })).toBeInTheDocument();
    expect(screen.getByLabelText('Short description')).toHaveValue(NEW_DESCRIPTION);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });
});
