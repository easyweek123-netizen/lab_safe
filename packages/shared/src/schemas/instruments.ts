import { z } from 'zod';
import { LabRoom } from './meta';
import { SafetyPageContent } from './safety-page';

// The one shape `SafetyPageView` renders, for the admin's preview and the public page
// (E04-D1, S04.1 API contract). Built on the server, so the view needs no other request.

/** The latest approval of a page; `null` while the page has never been approved. */
export const LastApproved = z.object({
  /** ISO 8601 date-time in UTC. */
  at: z.iso.datetime(),
  approverName: z.string(),
});
export type LastApproved = z.infer<typeof LastApproved>;

export const SafetyPageDisplay = z.object({
  content: SafetyPageContent,
  labRoom: LabRoom,
  lastApproved: LastApproved.nullable(),
});
export type SafetyPageDisplay = z.infer<typeof SafetyPageDisplay>;

/** `:slug` of `GET /api/instruments/:slug`; any other text is simply not found (S04.2). */
export const InstrumentSlugParam = z.object({
  slug: z.string().min(1).max(200),
});
export type InstrumentSlugParam = z.infer<typeof InstrumentSlugParam>;

/**
 * `GET /api/instruments/:slug`: a published page for anyone. No contributor, email, review note
 * or version (S04.2 AC4); `lastApproved` is always set here.
 */
export const PublishedSafetyPage = z.object({
  slug: z.string().min(1),
  page: SafetyPageDisplay.extend({
    lastApproved: LastApproved,
  }),
});
export type PublishedSafetyPage = z.infer<typeof PublishedSafetyPage>;
