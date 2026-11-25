import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstrumentRevision } from '../instruments/instrument-revision.entity';
import { Instrument } from '../instruments/instrument.entity';
import { RevisionHazard } from '../instruments/revision-hazard.entity';
import { RevisionProtectiveEquipment } from '../instruments/revision-protective-equipment.entity';
import { LabRoom } from '../meta/lab-room.entity';
import { PhotosModule } from '../photos/photos.module';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

/**
 * Submitting a safety page and listing one's own submissions (S03.1). Registers the instrument
 * entities of BE-02; `LabRoom` is listed too because the service checks the room inside its
 * transaction. `PhotosService` decides whether the photo is the caller's own upload.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Instrument,
      InstrumentRevision,
      RevisionHazard,
      RevisionProtectiveEquipment,
      LabRoom,
    ]),
    PhotosModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
