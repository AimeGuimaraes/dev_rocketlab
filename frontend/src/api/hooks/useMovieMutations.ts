import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, ensureOk, unwrap } from '../client';
import type { ApiError } from '../errors';
import type { MovieCreate, MovieDetail, MovieUpdate } from '../types';
import { queryKeys } from './queryKeys';

/** Cadastra um filme e já deixa o detalhe dele em cache. */
export function useCreateMovie() {
  const queryClient = useQueryClient();
  return useMutation<MovieDetail, ApiError, MovieCreate>({
    mutationFn: (body) => unwrap(api.POST('/movies', { body })),
    onSuccess: (movie) => {
      queryClient.setQueryData(queryKeys.movies.detail(movie.sk_movie_id), movie);
      return queryClient.invalidateQueries({ queryKey: queryKeys.movies.lists() });
    },
  });
}

/** Atualiza parcialmente um filme (PATCH). */
export function useUpdateMovie(id: string) {
  const queryClient = useQueryClient();
  return useMutation<MovieDetail, ApiError, MovieUpdate>({
    mutationFn: (body) =>
      unwrap(api.PATCH('/movies/{sk_movie_id}', { params: { path: { sk_movie_id: id } }, body })),
    onSuccess: (movie) => {
      // Só o detalhe exato: as avaliações não mudam com a edição do filme.
      queryClient.setQueryData(queryKeys.movies.detail(id), movie);
      return queryClient.invalidateQueries({ queryKey: queryKeys.movies.lists() });
    },
  });
}

/** Remove um filme; recebe o id na chamada (`mutate(id)`). */
export function useDeleteMovie() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) =>
      ensureOk(api.DELETE('/movies/{sk_movie_id}', { params: { path: { sk_movie_id: id } } })),
    onSuccess: (_data, id) => {
      // Remove o detalhe e, pelo prefixo, as avaliações do filme apagado.
      queryClient.removeQueries({ queryKey: queryKeys.movies.detail(id) });
      return queryClient.invalidateQueries({ queryKey: queryKeys.movies.lists() });
    },
  });
}
