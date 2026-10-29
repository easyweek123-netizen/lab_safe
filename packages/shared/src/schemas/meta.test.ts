import { describe, expect, it } from 'vitest';
import { LabRoom, ListItem, MetaListsResponse } from '../index';

const ROOM = {
  id: '0b6f1c1e-3f4a-4d8b-9a6e-2c5d7e8f9a01',
  code: 'LAB-101',
  name: 'Teaching lab 1',
};

const LISTS = {
  hazardTypes: [{ value: 'ELECTRICAL', label: 'Electrical' }],
  protectiveEquipment: [{ value: 'LAB_COAT', label: 'Lab coat' }],
  hazardPictograms: [{ value: 'FLAMMABLE', label: 'Flammable' }],
  categories: [{ value: 'OTHER', label: 'Other' }],
  hazardLevels: [{ value: 'LOW', label: 'Low' }],
};

describe('MetaListsResponse', () => {
  it('TC-1.3 accepts a valid body', () => {
    expect(MetaListsResponse.safeParse({ ...LISTS, labRooms: [ROOM] }).success).toBe(true);
  });

  it('TC-1.3 rejects a room without code', () => {
    const withoutCode = { id: ROOM.id, name: ROOM.name };

    expect(MetaListsResponse.safeParse({ ...LISTS, labRooms: [withoutCode] }).success).toBe(false);
    expect(LabRoom.safeParse(withoutCode).success).toBe(false);
  });

  it('TC-1.3 rejects a room whose id is not a UUID', () => {
    const notUuid = { ...ROOM, id: 'room-1' };

    expect(MetaListsResponse.safeParse({ ...LISTS, labRooms: [notUuid] }).success).toBe(false);
    expect(LabRoom.safeParse(notUuid).success).toBe(false);
  });

  it('TC-1.3 rejects a list item without label and a body without labRooms', () => {
    expect(ListItem.safeParse({ value: 'ELECTRICAL' }).success).toBe(false);
    expect(MetaListsResponse.safeParse(LISTS).success).toBe(false);
  });
});
