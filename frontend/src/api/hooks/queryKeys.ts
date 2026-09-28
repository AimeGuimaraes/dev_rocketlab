import type { MovieListParams } from '../types';

const movieAll = ['movies'] as const;
const movieLists = () => [...movieAll, 'list'] as const;
const movieDetail = (id: string) => [...movieAll, 'detail', id] as const;

/**
 * Fábrica central das query keys do TanStack Query.
 *
 * As avaliações ficam aninhadas no detalhe do filme: invalidar ou remover
 * `movies.detail(id)` também atinge `movies.reviews(id, ...)` pelo prefixo.
 */
export const queryKeys = {
  movies: {
    all: movieAll,
    lists: movieLists,
    list: (params: MovieListParams) => [...movieLists(), params] as const,
    detail: movieDetail,
    /** Sem `page`, é o prefixo de todas as páginas de avaliações do filme. */
    reviews: (id: string, page?: number, pageSize?: number) =>
      page === undefined
        ? ([...movieDetail(id), 'reviews'] as const)
        : ([...movieDetail(id), 'reviews', { page, pageSize }] as const),
  },
  genres: ['genres'] as const,
};
