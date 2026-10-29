import {
  CATEGORIES,
  HAZARD_LEVELS,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  MetaListsResponse,
  PROTECTIVE_EQUIPMENT,
} from '@labsafe/shared';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// The network for the web component tests. Fixtures are parsed with the shared schemas, so they
// always match the contract. Override a handler in one test with `server.use(…)`.

export const metaListsFixture = MetaListsResponse.parse({
  hazardTypes: HAZARD_TYPES,
  protectiveEquipment: PROTECTIVE_EQUIPMENT,
  hazardPictograms: HAZARD_PICTOGRAMS,
  categories: CATEGORIES,
  hazardLevels: HAZARD_LEVELS,
  labRooms: [
    { id: '0b6f8d2e-6a43-4c1b-9d2a-1f3e5a7c9b01', code: 'LAB-101', name: 'Teaching lab 1' },
    { id: '0b6f8d2e-6a43-4c1b-9d2a-1f3e5a7c9b02', code: 'LAB-102', name: 'Teaching lab 2' },
  ],
});

export const handlers = [http.get('*/api/meta/lists', () => HttpResponse.json(metaListsFixture))];

export const server = setupServer(...handlers);
