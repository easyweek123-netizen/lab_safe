import type { CurrentUser, Photo as PhotoResponse } from '@labsafe/shared';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import type { EntityManager, Repository } from 'typeorm';
import { AppException } from '../../common/app.exception';
import { PublishedInstrumentsQuery } from '../instruments/published-instruments.query';
import { Photo } from './photo.entity';
import { toPhotoResponse } from './photo.response';

/** The longest side of a stored photo, in pixels (E03-D8). */
export const PHOTO_MAX_SIDE = 1600;

/** JPEG quality of a stored photo (E03-D8). */
const PHOTO_JPEG_QUALITY = 80;

/** The formats `sharp` may find in an upload; anything else is 415 `PHOTO_TYPE`. */
const ACCEPTED_FORMATS: ReadonlySet<string> = new Set(['jpeg', 'png']);

const PHOTO_TYPE_MESSAGE = 'Only JPEG or PNG photos are accepted.';

/** The re-encoded photo: a JPEG without metadata and its size. */
interface EncodedPhoto {
  bytes: Buffer;
  width: number;
  height: number;
}

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    @InjectRepository(Photo) private readonly photos: Repository<Photo>,
    private readonly publishedInstruments: PublishedInstrumentsQuery,
  ) {}

  /**
   * Stores an upload of `ownerId` (S03.1 AC4–AC7). `upload` is the file buffer multer kept in
   * memory, or undefined when the request held no file in `photo`. The file's name and stated
   * type are ignored: `sharp` reads the format from the bytes.
   */
  async upload(ownerId: string, upload: Buffer | undefined): Promise<PhotoResponse> {
    if (upload === undefined || upload.length === 0) {
      throw new AppException(400, 'VALIDATION_FAILED', 'Some fields are missing or invalid.', [
        { path: 'photo', message: 'Choose a photo' },
      ]);
    }
    const encoded = await this.encode(upload);
    const photo = await this.photos.save(
      this.photos.create({
        ownerId,
        contentType: 'image/jpeg',
        bytes: encoded.bytes,
        width: encoded.width,
        height: encoded.height,
      }),
    );
    return toPhotoResponse(photo);
  }

  /**
   * The bytes of photo `id` for `user`: the photo of a published revision goes to anyone
   * (S04.2 AC4, AC12, E04-D7, I11); any other photo only to its owner and approved admins
   * (E03-D4). Everyone else, and an id that does not exist, get the same 404 `NOT_FOUND`.
   */
  async read(id: string, user: CurrentUser | null): Promise<Buffer> {
    const photo = await this.photos.findOne({
      select: { id: true, bytes: true },
      where: await this.readableWhere(id, user),
    });
    if (photo === null) {
      throw notFound();
    }
    return photo.bytes;
  }

  /**
   * Which photo row `user` may read as `id`: any row for an approved admin and for a published
   * revision's photo, only their own for another approved account. Everyone else is 404.
   */
  private async readableWhere(
    id: string,
    user: CurrentUser | null,
  ): Promise<{ id: string; ownerId?: string }> {
    const approved = user !== null && user.status === 'APPROVED';
    if (
      (approved && user.role === 'ADMIN') ||
      (await this.publishedInstruments.isPublishedPhoto(id))
    ) {
      return { id };
    }
    if (!approved) {
      throw notFound();
    }
    return { id, ownerId: user.id };
  }

  /**
   * Whether `photoId` is an upload of `userId` (for submitting a page, BE-04). Pass the
   * transaction's `manager` to run the check inside it.
   */
  async isOwnedBy(photoId: string, userId: string, manager?: EntityManager): Promise<boolean> {
    const photos = manager ? manager.getRepository(Photo) : this.photos;
    return photos.exists({ where: { id: photoId, ownerId: userId } });
  }

  /**
   * Re-encodes an upload as in decision E03-D8: auto-rotated, inside 1600 × 1600 without
   * enlarging, flattened on white, JPEG quality 80, no metadata (sharp keeps none unless asked).
   * sharp's input pixel limit stays on. Anything sharp cannot read, or that is not a JPEG or a
   * PNG, is 415 `PHOTO_TYPE`.
   */
  private async encode(upload: Buffer): Promise<EncodedPhoto> {
    let format: string | undefined;
    try {
      ({ format } = await sharp(upload).metadata());
    } catch (error) {
      this.logger.warn(`Unreadable photo upload: ${errorMessage(error)}`);
      throw photoTypeError();
    }
    if (format === undefined || !ACCEPTED_FORMATS.has(format)) {
      throw photoTypeError();
    }
    try {
      const { data, info } = await sharp(upload)
        .rotate()
        .resize(PHOTO_MAX_SIDE, PHOTO_MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: PHOTO_JPEG_QUALITY })
        .toBuffer({ resolveWithObject: true });
      return { bytes: data, width: info.width, height: info.height };
    } catch (error) {
      this.logger.warn(`Photo upload could not be decoded: ${errorMessage(error)}`);
      throw photoTypeError();
    }
  }
}

function notFound(): AppException {
  return new AppException(404, 'NOT_FOUND', 'Not found.');
}

function photoTypeError(): AppException {
  return new AppException(415, 'PHOTO_TYPE', PHOTO_TYPE_MESSAGE);
}

/** sharp's message only: never the file contents. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
