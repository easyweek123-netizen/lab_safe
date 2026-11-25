import type { Photo as PhotoResponse } from '@labsafe/shared';
import type { Photo } from './photo.entity';

/** The shared `Photo` of a stored photo: never the bytes or the owner. */
export function toPhotoResponse(photo: Pick<Photo, 'id' | 'width' | 'height'>): PhotoResponse {
  return { id: photo.id, width: photo.width, height: photo.height };
}
