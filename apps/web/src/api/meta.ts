import { MetaListsResponse } from '@labsafe/shared';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

/** The fixed lists and the lab rooms (`GET /api/meta/lists`). They do not change while the app runs. */
export function useMetaLists() {
  return useQuery({
    queryKey: ['meta', 'lists'],
    queryFn: () => apiGet('/meta/lists', MetaListsResponse),
    staleTime: Infinity,
  });
}
