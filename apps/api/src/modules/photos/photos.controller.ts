import {
  type CurrentUser as CurrentUserResponse,
  PHOTO_MAX_BYTES,
  PHOTO_UPLOAD_FIELD,
  type Photo,
  PhotoIdParam,
} from '@labsafe/shared';
import {
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Contributor, CurrentUser, Public } from '../../common/access';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
// Type only: brings in the global `Express.Multer.File` of `@types/multer`.
import type {} from 'multer';
import { PhotoUploadErrorsInterceptor } from './photo-upload-errors.interceptor';
import { PhotosService } from './photos.service';

/**
 * `POST /api/photos` and `GET /api/photos/:id` (S03.1 API contract). The guards run before the
 * interceptors, so a refused caller's file is never read. The upload stays in memory, at most
 * one file of `PHOTO_MAX_BYTES`.
 */
@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Contributor()
  @Post()
  @HttpCode(201)
  @UseInterceptors(
    PhotoUploadErrorsInterceptor,
    // No `dest` or `storage`: multer keeps the file in memory.
    FileInterceptor(PHOTO_UPLOAD_FIELD, {
      limits: { fileSize: PHOTO_MAX_BYTES, files: 1 },
    }),
  )
  upload(
    @CurrentUser() user: CurrentUserResponse,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<Photo> {
    return this.photosService.upload(user.id, file?.buffer);
  }

  /** Public at the guard; the service answers 404 to everyone but the owner and admins (E03-D4). */
  @Public()
  @Get(':id')
  @Header('Cache-Control', 'private, no-cache')
  @Header('X-Content-Type-Options', 'nosniff')
  async read(
    @Param(new ZodValidationPipe(PhotoIdParam)) params: PhotoIdParam,
    @CurrentUser() user: CurrentUserResponse | null,
  ): Promise<StreamableFile> {
    const bytes = await this.photosService.read(params.id, user);
    return new StreamableFile(bytes, { type: 'image/jpeg' });
  }
}
