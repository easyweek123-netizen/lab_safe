import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabRoom } from './lab-room.entity';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';

@Module({
  imports: [TypeOrmModule.forFeature([LabRoom])],
  controllers: [MetaController],
  providers: [MetaService],
})
export class MetaModule {}
