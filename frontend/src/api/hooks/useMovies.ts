import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api, unwrap } from '../client';
import type { ApiError } from '../errors';
import type { MovieDetail, MovieListItem, MovieListParams, Page } from '../types';
import { queryKeys } from './queryKeys';

/** Catálogo paginado; mantém a página anterior na tela enquanto a próxima carrega. */
export function useMovies(params: MovieListParams = {}) {
  return useQuery<Page<MovieListItem>, ApiError>({
    queryKey: queryKeys.movies.list(params),
    queryFn: ({ signal }) => unwrap(api.GET('/movies', { params: { query: params }, signal })),
    placeholderData: keepPreviousData,
  });
}

/** Detalhe completo de um filme; não busca enquanto não houver id. */
export function useMovie(id: string | undefined) {
  return useQuery<MovieDetail, ApiError>({
    queryKey: queryKeys.movies.detail(id ?? ''),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/movies/{sk_movie_id}', {
          params: { path: { sk_movie_id: id ?? '' } },
          signal,
        }),
      ),
    enabled: Boolean(id),
  });
}
