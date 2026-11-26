import { MySubmissions } from '@labsafe/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  approvedUser,
  errorResponse,
  meHandler,
  MY_SUBMISSIONS,
  mySubmissionsFixture,
  mySubmissionsHandler,
  server,
} from '../../test/msw';
import { renderApp } from '../../test/render';

const PAGE = '/contribute';

/** Two submissions, newest first, as `GET /api/submissions/mine` answers. */
const twoSubmissions = MySubmissions.parse({
  submissions: [
    {
      id: '3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e02',
      name: 'Fume hood',
      status: 'PENDING',
      submittedAt: '2026-11-24T15:30:00.000Z',
      slug: null,
      reviewNote: null,
    },
    ...mySubmissionsFixture.submissions,
    {
      id: '3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e03',
      name: 'Centrifuge',
      status: 'PENDING',
      submittedAt: '2026-11-02T09:00:00.000Z',
      slug: null,
      reviewNote: null,
    },
  ],
});

async function findList() {
  return screen.findByRole('list', { name: 'My submissions' });
}

describe('My submissions on /contribute', () => {
  it('S03.1 AC16 lists the own submissions newest first with name, date and "Status: Pending"', async () => {
    server.use(meHandler(approvedUser), mySubmissionsHandler(twoSubmissions));
    renderApp(PAGE);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contributor area' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Here you will write and update safety pages.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New safety page' })).toHaveAttribute(
      'href',
      '/contribute/new',
    );
    expect(screen.getByRole('heading', { level: 2, name: 'My submissions' })).toBeInTheDocument();

    const rows = within(await findList()).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    const [first, second, third] = rows as [HTMLElement, HTMLElement, HTMLElement];
    expect(first).toHaveTextContent('Fume hood');
    expect(second).toHaveTextContent('Rotary evaporator');
    expect(third).toHaveTextContent('Centrifuge');

    expect(within(second).getByText('Rotary evaporator')).toBeInTheDocument();
    expect(within(second).getByText(/^Submitted/)).toHaveTextContent('Submitted 24 Nov 2026');
    expect(within(second).getByText('Status: Pending')).toBeInTheDocument();
    expect(within(third).getByText(/^Submitted/)).toHaveTextContent('Submitted 2 Nov 2026');
  });

  it('S03.1 AC16 shows "You haven\'t submitted any pages yet." when the list is empty', async () => {
    server.use(meHandler(approvedUser), mySubmissionsHandler({ submissions: [] }));
    renderApp(PAGE);

    expect(await screen.findByText("You haven't submitted any pages yet.")).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'My submissions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('S03.1 AC16 shows status "Loading your submissions…" while the list loads', async () => {
    server.use(
      meHandler(approvedUser),
      http.get(MY_SUBMISSIONS, async () => {
        await delay('infinite');
        return HttpResponse.json(mySubmissionsFixture);
      }),
    );
    renderApp(PAGE);

    expect(await screen.findByText('Loading your submissions…')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('heading', { level: 1, name: 'Contributor area' })).toBeInTheDocument();
  });

  it('S03.1 AC16 shows alert "Couldn\'t load your submissions, try again." and Retry loads the list again', async () => {
    let calls = 0;
    server.use(
      meHandler(approvedUser),
      http.get(MY_SUBMISSIONS, () => {
        calls += 1;
        return calls === 1
          ? errorResponse(500, 'INTERNAL_ERROR', 'Something went wrong')
          : HttpResponse.json(mySubmissionsFixture);
      }),
    );
    const { user } = renderApp(PAGE);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load your submissions, try again.",
    );
    // The rest of the contributor area stays.
    expect(screen.getByRole('link', { name: 'New safety page' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    const list = await findList();
    expect(within(list).getByText('Rotary evaporator')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it('S03.1 AC8 shows the confirmation from the router state above My submissions', async () => {
    server.use(meHandler(approvedUser), mySubmissionsHandler(mySubmissionsFixture));
    const { router } = renderApp('/');

    await router.navigate(PAGE, {
      state: { confirmation: 'Rotary evaporator was submitted and is waiting for review.' },
    });

    expect(
      await screen.findByText('Rotary evaporator was submitted and is waiting for review.'),
    ).toHaveAttribute('role', 'status');
    const row = within(await findList()).getByRole('listitem');
    expect(row).toHaveTextContent('Rotary evaporator');
    expect(row).toHaveTextContent('Submitted 24 Nov 2026');
    expect(row).toHaveTextContent('Status: Pending');
  });

  it('S03.1 AC8 shows no confirmation without router state, and ignores state that is not a text', async () => {
    server.use(meHandler(approvedUser), mySubmissionsHandler(mySubmissionsFixture));
    const { router } = renderApp(PAGE);

    await findList();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await router.navigate(PAGE, { state: { confirmation: 42 } });
    await findList();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('S03.2 AC1 makes each name a link to its edit page', async () => {
    server.use(meHandler(approvedUser), mySubmissionsHandler(twoSubmissions));
    renderApp(PAGE);

    const list = await findList();
    expect(within(list).getByRole('link', { name: 'Rotary evaporator' })).toHaveAttribute(
      'href',
      `/contribute/submissions/${mySubmissionsFixture.submissions[0]?.id ?? ''}`,
    );
    expect(within(list).getByRole('link', { name: 'Fume hood' })).toHaveAttribute(
      'href',
      '/contribute/submissions/3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e02',
    );
  });

  it('S04.2 AC10 shows an approved row as "Status: Approved" with its name linking to the public page', async () => {
    const approvedList = MySubmissions.parse({
      submissions: [
        twoSubmissions.submissions[0],
        {
          ...mySubmissionsFixture.submissions[0],
          status: 'APPROVED',
          slug: 'rotary-evaporator',
        },
      ],
    });
    server.use(meHandler(approvedUser), mySubmissionsHandler(approvedList));
    renderApp(PAGE);

    const rows = within(await findList()).getAllByRole('listitem');
    const [pending, approved] = rows as [HTMLElement, HTMLElement];
    expect(within(approved).getByText('Status: Approved')).toBeInTheDocument();
    expect(within(approved).getByRole('link', { name: 'Rotary evaporator' })).toHaveAttribute(
      'href',
      '/instruments/rotary-evaporator',
    );
    // Nothing offers to edit the approved page.
    expect(within(approved).getAllByRole('link')).toHaveLength(1);
    expect(
      screen
        .getAllByRole('link')
        .some((link) =>
          link.getAttribute('href')?.endsWith(mySubmissionsFixture.submissions[0]?.id ?? '-'),
        ),
    ).toBe(false);
    // A pending row keeps its edit link.
    expect(within(pending).getByText('Status: Pending')).toBeInTheDocument();
    expect(within(pending).getByRole('link', { name: 'Fume hood' })).toHaveAttribute(
      'href',
      '/contribute/submissions/3f2e1d0c-9b8a-4c7d-8e6f-5a4b3c2d1e02',
    );
  });

  it('S04.3 AC4 shows a rejected row as "Status: Rejected" with the admin\'s note word for word and the link to the fix form', async () => {
    const note = 'The photo is blurry; add the waste step to Safe operation.\nThanks!';
    const rejectedList = MySubmissions.parse({
      submissions: [
        twoSubmissions.submissions[0],
        { ...mySubmissionsFixture.submissions[0], status: 'REJECTED', reviewNote: note },
      ],
    });
    server.use(meHandler(approvedUser), mySubmissionsHandler(rejectedList));
    renderApp(PAGE);

    const rows = within(await findList()).getAllByRole('listitem');
    const [pending, rejected] = rows as [HTMLElement, HTMLElement];
    expect(within(rejected).getByText('Status: Rejected')).toBeInTheDocument();
    const shownNote = within(rejected).getByText(/^Admin's note:/);
    // Word for word, the line break kept (not collapsed into a space).
    expect(shownNote.textContent).toBe(`Admin's note: ${note}`);
    expect(shownNote).toHaveClass('whitespace-pre-wrap');
    expect(within(rejected).getByRole('link', { name: 'Rotary evaporator' })).toHaveAttribute(
      'href',
      `/contribute/submissions/${mySubmissionsFixture.submissions[0]?.id ?? ''}`,
    );
    // A pending row has no note.
    expect(within(pending).getByText('Status: Pending')).toBeInTheDocument();
    expect(within(pending).queryByText(/Admin's note/)).not.toBeInTheDocument();
  });

  it('S04.3 AC6 shows a resubmitted row as "Status: Pending" with no note', async () => {
    server.use(meHandler(approvedUser), mySubmissionsHandler(mySubmissionsFixture));
    renderApp(PAGE);

    const row = within(await findList()).getByRole('listitem');
    expect(within(row).getByText('Status: Pending')).toBeInTheDocument();
    expect(within(row).queryByText(/Admin's note/)).not.toBeInTheDocument();
  });
});
