import {
  CATEGORIES,
  HAZARD_LEVELS,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  type ListItem,
  type MetaListsResponse,
  PROTECTIVE_EQUIPMENT,
} from '@labsafe/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { LabRoom } from './lab-room.entity';

/** Plain `{ value, label }` copies, in the order the shared list defines. */
function toListItems(list: ReadonlyArray<{ value: string; label: string }>): ListItem[] {
  return list.map(({ value, label }) => ({ value, label }));
}

@Injectable()
export class MetaService {
  constructor(@InjectRepository(LabRoom) private readonly labRooms: Repository<LabRoom>) {}

  /**
   * The five fixed lists and the lab rooms sorted by code (AC1). A failing query is not caught:
   * the `ErrorFilter` turns it into 500 `INTERNAL_ERROR` without its details (AC2).
   */
  async getLists(): Promise<MetaListsResponse> {
    const rooms = await this.labRooms.find({ order: { code: 'ASC' } });
    return {
      hazardTypes: toListItems(HAZARD_TYPES),
      protectiveEquipment: toListItems(PROTECTIVE_EQUIPMENT),
      hazardPictograms: toListItems(HAZARD_PICTOGRAMS),
      categories: toListItems(CATEGORIES),
      hazardLevels: toListItems(HAZARD_LEVELS),
      labRooms: rooms.map(({ id, code, name }) => ({ id, code, name })),
    };
  }
}
