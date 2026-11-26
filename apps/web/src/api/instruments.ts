import { PublishedSafetyPage } from '@labsafe/shared';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

/** The query key of `usePublishedPage(slug)`. */
export function publishedPageKey(slug: string) {
  return ['instruments', slug] as const;
}

/**
 * A published safety page for anyone, no login needed (`GET /api/instruments/:slug`, S04.2). The
 * server answers 404 for an unknown or unpublished slug. A failed background refresh keeps the
 * cached page (E03-D7); the page decides that. Not sent while `enabled` is false (a slug outside
 * `InstrumentSlugParam`).
 */
export function usePublishedPage(slug: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: publishedPageKey(slug),
    queryFn: () => apiGet(`/instruments/${encodeURIComponent(slug)}`, PublishedSafetyPage),
    enabled,
  });
}
