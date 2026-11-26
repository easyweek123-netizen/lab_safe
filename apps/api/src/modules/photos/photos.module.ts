import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstrumentsModule } from '../instruments/instruments.module';
import { Photo } from './photo.entity';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

/**
 * Photo upload and serving (S03.1). Exports `PhotosService` for the ownership check when a
 * page is submitted (BE-04). Imports `InstrumentsModule` to serve a published page's photo to
 * anyone (S04.2, E04-D7).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Photo]), InstrumentsModule],
  controllers: [PhotosController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
