import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, unwrap } from '../client';
import type { ApiError } from '../errors';
import type { Page, ReviewCreate, ReviewCreated, ReviewRead } from '../types';
import { queryKeys } from './queryKeys';

/** Avaliações paginadas de um filme (mais recentes primeiro). */
export function useReviews(id: string | undefined, page = 1, pageSize?: number) {
  return useQuery<Page<ReviewRead>, ApiError>({
    queryKey: queryKeys.movies.reviews(id ?? '', page, pageSize),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/movies/{sk_movie_id}/reviews', {
          params: { path: { sk_movie_id: id ?? '' }, query: { page, page_size: pageSize } },
          signal,
        }),
      ),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}

/** Cria uma avaliação; a média muda no detalhe, nas avaliações e nos cards do catálogo. */
export function useCreateReview(id: string) {
  const queryClient = useQueryClient();
  return useMutation<ReviewCreated, ApiError, ReviewCreate>({
    mutationFn: (body) =>
      unwrap(
        api.POST('/movies/{sk_movie_id}/reviews', {
          params: { path: { sk_movie_id: id } },
          body,
        }),
      ),
    onSuccess: () =>
      Promise.all([
        // Pelo prefixo, invalida também todas as páginas de avaliações do filme.
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.detail(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.movies.lists() }),
      ]),
  });
}
