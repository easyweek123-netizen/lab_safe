import { Photo, PHOTO_UPLOAD_FIELD } from '@labsafe/shared';
import { useIsMutating, useMutation } from '@tanstack/react-query';
import { apiSendForm } from './client';

const UPLOAD_KEY = ['photos', 'upload'] as const;

/** The address of a stored photo; the server serves it only to its owner and admins until published. */
export function photoUrl(id: string): string {
  return `/api/photos/${encodeURIComponent(id)}`;
}

/**
 * `POST /api/photos` with the file in `photo` → 201 `Photo` (decision E03-D1). Sent at once even
 * offline (`networkMode: 'always'`, E03-D7), so it fails with a message instead of waiting. A 401
 * or 403 does not ask `me` again: the form must stay on screen (AC17).
 */
export function useUploadPhoto() {
  return useMutation({
    mutationKey: UPLOAD_KEY,
    networkMode: 'always',
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append(PHOTO_UPLOAD_FIELD, file);
      return apiSendForm('/photos', form, Photo);
    },
  });
}

/** True while a photo upload is running; the form disables "Submit for review" meanwhile. */
export function useIsUploadingPhoto(): boolean {
  return useIsMutating({ mutationKey: UPLOAD_KEY }) > 0;
}
