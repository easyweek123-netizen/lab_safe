import { z } from 'zod';

// `GET /api/meta/lists` (S01.2 API contract): the fixed lists of `lists.ts` and the lab rooms.

export const ListItem = z.object({
  value: z.string(),
  label: z.string(),
});
export type ListItem = z.infer<typeof ListItem>;

export const LabRoom = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
});
export type LabRoom = z.infer<typeof LabRoom>;

export const MetaListsResponse = z.object({
  hazardTypes: z.array(ListItem),
  protectiveEquipment: z.array(ListItem),
  hazardPictograms: z.array(ListItem),
  categories: z.array(ListItem),
  hazardLevels: z.array(ListItem),
  labRooms: z.array(LabRoom),
});
export type MetaListsResponse = z.infer<typeof MetaListsResponse>;
