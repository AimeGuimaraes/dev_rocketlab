import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, ensureOk, unwrap } from '../client';
import { ApiError } from '../errors';
import type { MovieCreate, MovieDetail, MovieListItem, MovieUpdate, Page } from '../types';
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

/**
 * Remove um filme; recebe o id na chamada (`mutate(id)`).
 *
 * Um 404 conta como sucesso: a remoção é idempotente e o filme já não existe (ex.: removido
 * em outra aba), então o cache é limpo do mesmo jeito.
 */
export function useDeleteMovie() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      try {
        await ensureOk(
          api.DELETE('/movies/{sk_movie_id}', { params: { path: { sk_movie_id: id } } }),
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return;
        throw error;
      }
    },
    onSuccess: async (_data, id) => {
      const detailKey = queryKeys.movies.detail(id);
      // Cancela antes de remover: um refetch em andamento do detalhe ou das avaliações
      // terminaria em 404 e notificaria a página ainda montada, mostrando o erro.
      await queryClient.cancelQueries({ queryKey: detailKey });
      // Remove o detalhe e, pelo prefixo, as avaliações do filme apagado.
      queryClient.removeQueries({ queryKey: detailKey });
      // Tira o filme das listas em cache para o catálogo não exibi-lo enquanto o refetch roda.
      queryClient.setQueriesData<Page<MovieListItem>>(
        { queryKey: queryKeys.movies.lists() },
        (page) => {
          if (!page?.items.some((movie) => movie.sk_movie_id === id)) return page;
          return {
            ...page,
            items: page.items.filter((movie) => movie.sk_movie_id !== id),
            total: Math.max(0, page.total - 1),
          };
        },
      );
      // Pelo prefixo, atinge todas as listagens: páginas, busca, filtros e ordenações.
      return queryClient.invalidateQueries({ queryKey: queryKeys.movies.lists() });
    },
  });
}
