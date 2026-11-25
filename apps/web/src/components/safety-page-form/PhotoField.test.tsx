import { PHOTO_MAX_BYTES, PHOTO_UPLOAD_FIELD } from '@labsafe/shared';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useIsUploadingPhoto } from '../../api/photos';
import { errorResponse, photoFixture, PHOTOS, server, uploadedFile } from '../../test/msw';
import { PhotoField } from './PhotoField';

const OTHER_PHOTO_ID = '9c4e2a1b-7d3f-4e5a-8b6c-1d2e3f4a5b02';
const NETWORK_MESSAGE = "Couldn't upload the photo. Check your connection and try again.";

/** Stands in for the form: holds the photo id and shows what the form would know. */
function Harness({ initial }: { initial?: string }) {
  const [photoId, setPhotoId] = useState<string | null>(initial ?? null);
  const uploading = useIsUploadingPhoto();
  return (
    <>
      <PhotoField id="page-photo" value={photoId} onChange={setPhotoId} />
      <p>Form photo id: {photoId ?? 'none'}</p>
      <button type="button" disabled={uploading}>
        Submit for review
      </button>
    </>
  );
}

function renderField(initial?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <Harness initial={initial} />
    </QueryClientProvider>,
  );
  return { user };
}

function jpeg(name = 'rotavap.jpg', bytes = 2048): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });
}

/** Holds the upload open until `release()`, and counts the requests. */
function gatedUpload() {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const seen: unknown[] = [];
  server.use(
    http.post(PHOTOS, async ({ request }) => {
      seen.push(await uploadedFile(request, PHOTO_UPLOAD_FIELD));
      await gate;
      return HttpResponse.json(photoFixture, { status: 201 });
    }),
  );
  return { seen, release };
}

function countingFailure(response: () => Response) {
  const seen: number[] = [];
  server.use(
    http.post(PHOTOS, () => {
      seen.push(1);
      return response();
    }),
  );
  return seen;
}

describe('PhotoField', () => {
  it('S03.1 AC4 shows the hint, accepts only JPEG or PNG and is labelled "Photo"', () => {
    renderField();

    const input = screen.getByLabelText('Photo');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/jpeg, image/png');
    expect(input).toHaveAccessibleDescription('JPEG or PNG, at most 5 MB');
  });

  it('S03.1 AC4 uploads at once, shows "Uploading photo…", then the stored photo and "Change photo"', async () => {
    const upload = gatedUpload();
    const { user } = renderField();

    await user.upload(screen.getByLabelText('Photo'), jpeg());

    expect(await screen.findByRole('status')).toHaveTextContent('Uploading photo…');
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();

    upload.release();

    const img = await screen.findByRole('img', { name: 'Photo of the instrument' });
    expect(img).toHaveAttribute('src', `/api/photos/${photoFixture.id}`);
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
    expect(screen.getByText(`Form photo id: ${photoFixture.id}`)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeEnabled();
    expect(upload.seen).toEqual([{ name: 'rotavap.jpg', type: 'image/jpeg' }]);
  });

  it('S03.1 AC4 "Change photo" is reachable by keyboard and replaces the photo', async () => {
    server.use(
      http.post(PHOTOS, () =>
        HttpResponse.json({ ...photoFixture, id: OTHER_PHOTO_ID }, { status: 201 }),
      ),
    );
    const { user } = renderField(photoFixture.id);

    expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
      'src',
      `/api/photos/${photoFixture.id}`,
    );
    const input = screen.getByLabelText('Photo');
    const openPicker = vi.spyOn(input, 'click');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Change photo' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(openPicker).toHaveBeenCalled();

    await user.upload(screen.getByLabelText('Photo'), jpeg('new.png'));

    expect(await screen.findByText(`Form photo id: ${OTHER_PHOTO_ID}`)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
      'src',
      `/api/photos/${OTHER_PHOTO_ID}`,
    );
  });

  it('S03.1 AC5 does not upload a file over 5 MB and says "The photo must be at most 5 MB."', async () => {
    const seen = countingFailure(() => HttpResponse.json(photoFixture, { status: 201 }));
    const { user } = renderField();

    await user.upload(screen.getByLabelText('Photo'), jpeg('huge.jpg', PHOTO_MAX_BYTES + 1));

    expect(screen.getByText('The photo must be at most 5 MB.')).toBeInTheDocument();
    expect(screen.getByLabelText('Photo')).toHaveAccessibleDescription(
      'JPEG or PNG, at most 5 MB The photo must be at most 5 MB.',
    );
    expect(screen.getByLabelText('Photo')).toHaveAttribute('aria-invalid', 'true');
    expect(seen).toHaveLength(0);
    expect(screen.getByText('Form photo id: none')).toBeInTheDocument();
  });

  it('S03.1 AC5 uploads a file of exactly 5 MB', async () => {
    const upload = gatedUpload();
    upload.release();
    const { user } = renderField();

    await user.upload(screen.getByLabelText('Photo'), jpeg('edge.jpg', PHOTO_MAX_BYTES));

    expect(await screen.findByText(`Form photo id: ${photoFixture.id}`)).toBeInTheDocument();
    expect(screen.queryByText('The photo must be at most 5 MB.')).not.toBeInTheDocument();
  });

  it("S03.1 AC5 shows the server's 413 message", async () => {
    countingFailure(() => errorResponse(413, 'PHOTO_TOO_LARGE', 'The photo must be at most 5 MB.'));
    const { user } = renderField();

    await user.upload(screen.getByLabelText('Photo'), jpeg());

    expect(await screen.findByText('The photo must be at most 5 MB.')).toBeInTheDocument();
  });

  it('S03.1 AC6 shows "Only JPEG or PNG photos are accepted." for a 415 and keeps no photo', async () => {
    countingFailure(() =>
      errorResponse(415, 'PHOTO_TYPE', 'Only JPEG or PNG photos are accepted.'),
    );
    const { user } = renderField();

    await user.upload(screen.getByLabelText('Photo'), jpeg('report.pdf.jpg'));

    expect(await screen.findByText('Only JPEG or PNG photos are accepted.')).toBeInTheDocument();
    expect(screen.getByLabelText('Photo')).toHaveAccessibleDescription(
      'JPEG or PNG, at most 5 MB Only JPEG or PNG photos are accepted.',
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Form photo id: none')).toBeInTheDocument();
  });

  it("S03.1 AC6 shows the server's photo field message for a 400", async () => {
    countingFailure(() =>
      HttpResponse.json(
        {
          statusCode: 400,
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          fields: [{ path: 'photo', message: 'Choose a photo' }],
        },
        { status: 400 },
      ),
    );
    const { user } = renderField();

    await user.upload(screen.getByLabelText('Photo'), jpeg());

    expect(await screen.findByText('Choose a photo')).toBeInTheDocument();
  });

  it('S03.1 AC17 keeps the photo and shows the upload message on a network error', async () => {
    countingFailure(() => HttpResponse.error());
    const { user } = renderField(photoFixture.id);

    await user.upload(screen.getByLabelText('Photo'), jpeg('second.jpg'));

    expect(await screen.findByText(NETWORK_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(`Form photo id: ${photoFixture.id}`)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo of the instrument' })).toHaveAttribute(
      'src',
      `/api/photos/${photoFixture.id}`,
    );
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
  });

  it('S03.1 AC17 fails at once with the upload message while offline', async () => {
    countingFailure(() => HttpResponse.error());
    onlineManager.setOnline(false);
    try {
      const { user } = renderField();

      await user.upload(screen.getByLabelText('Photo'), jpeg());

      expect(await screen.findByText(NETWORK_MESSAGE)).toBeInTheDocument();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('S03.1 AC17 shows the upload message on a 500', async () => {
    countingFailure(() => errorResponse(500, 'INTERNAL_ERROR', 'Internal server error'));
    const { user } = renderField();

    await user.upload(screen.getByLabelText('Photo'), jpeg());

    expect(await screen.findByText(NETWORK_MESSAGE)).toBeInTheDocument();
  });

  it('S03.1 AC17 shows the session message on a 401', async () => {
    countingFailure(() => errorResponse(401, 'UNAUTHENTICATED', 'Log in first'));
    const { user } = renderField();

    await user.upload(screen.getByLabelText('Photo'), jpeg());

    expect(
      await screen.findByText(
        'Your session has ended. Log in again in another tab, then submit again here.',
      ),
    ).toBeInTheDocument();
  });

  it('S03.1 AC17 shows "Your account can\'t submit pages." on a 403', async () => {
    countingFailure(() => errorResponse(403, 'FORBIDDEN', 'Forbidden'));
    const { user } = renderField();

    await user.upload(screen.getByLabelText('Photo'), jpeg());

    expect(await screen.findByText("Your account can't submit pages.")).toBeInTheDocument();
  });

  it('S03.1 AC17 clears the old message when a new photo is chosen', async () => {
    const seen = countingFailure(() => HttpResponse.error());
    const { user } = renderField();
    await user.upload(screen.getByLabelText('Photo'), jpeg());
    expect(await screen.findByText(NETWORK_MESSAGE)).toBeInTheDocument();

    server.use(http.post(PHOTOS, () => HttpResponse.json(photoFixture, { status: 201 })));
    await user.upload(screen.getByLabelText('Photo'), jpeg('again.jpg'));

    expect(await screen.findByText(`Form photo id: ${photoFixture.id}`)).toBeInTheDocument();
    expect(screen.queryByText(NETWORK_MESSAGE)).not.toBeInTheDocument();
    expect(seen).toHaveLength(1);
  });

  it("S03.1 AC9 shows the form's own message when no photo is uploaded", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <PhotoField
          id="page-photo"
          value={null}
          onChange={() => undefined}
          error="Upload a photo"
        />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText('Photo')).toHaveAccessibleDescription(
      'JPEG or PNG, at most 5 MB Upload a photo',
    );
  });
});
