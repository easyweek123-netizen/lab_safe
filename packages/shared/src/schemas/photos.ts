import { z } from 'zod';

// Photo upload and serving (S03.1 API contract, E03-D1, E03-D8).

/** The largest upload `POST /api/photos` accepts: 5 MB. Larger is 413 `PHOTO_TOO_LARGE`. */
export const PHOTO_MAX_BYTES = 5_242_880;

/** The multipart field that holds the file. */
export const PHOTO_UPLOAD_FIELD = 'photo';

/** A stored photo: always a re-encoded JPEG, at most 1600 px on its longer side. */
export const Photo = z.object({
  id: z.uuid(),
  width: z.int(),
  height: z.int(),
});
export type Photo = z.infer<typeof Photo>;

/** `:id` of `GET /api/photos/:id`. */
export const PhotoIdParam = z.object({
  id: z.uuid(),
});
export type PhotoIdParam = z.infer<typeof PhotoIdParam>;
