import { useQuery } from '@tanstack/react-query';

import { api, unwrap } from '../client';
import type { ApiError } from '../errors';
import type { Genre } from '../types';
import { queryKeys } from './queryKeys';

// Gêneros praticamente não mudam: uma busca por hora basta.
const GENRES_STALE_TIME = 60 * 60 * 1000;

/** Lista de gêneros para filtros e formulários. */
export function useGenres() {
  return useQuery<Genre[], ApiError>({
    queryKey: queryKeys.genres,
    queryFn: ({ signal }) => unwrap(api.GET('/genres', { signal })),
    staleTime: GENRES_STALE_TIME,
  });
}
