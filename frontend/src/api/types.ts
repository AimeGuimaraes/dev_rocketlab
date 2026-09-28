import type { components, paths } from './schema';

/** Schemas do OpenAPI do backend (gerados em `schema.d.ts`). */
type Schemas = components['schemas'];

export type MovieListItem = Schemas['MovieListItem'];
export type MovieDetail = Schemas['MovieDetail'];
export type MoviePerformance = Schemas['MoviePerformance'];
export type MovieCreate = Schemas['MovieCreate'];
export type MovieUpdate = Schemas['MovieUpdate'];
export type MovieSort = Schemas['MovieSort'];
export type SortOrder = Schemas['SortOrder'];
export type Genre = Schemas['GenreRead'];
export type ReviewRead = Schemas['ReviewRead'];
export type ReviewCreate = Schemas['ReviewCreate'];
export type ReviewCreated = Schemas['ReviewCreated'];
export type ErrorItem = Schemas['ErrorItem'];
export type ErrorResponse = Schemas['ErrorResponse'];

/** Resposta paginada padrão da API: `{ items, total, page, page_size, pages }`. */
export type Page<T> = Omit<Schemas['Page_MovieListItem_'], 'items'> & { items: T[] };

/** Parâmetros de busca, filtro, ordenação e paginação do catálogo. */
export type MovieListParams = NonNullable<paths['/api/v1/movies']['get']['parameters']['query']>;

/** Parâmetros de paginação das avaliações de um filme. */
export type ReviewListParams = NonNullable<
  paths['/api/v1/movies/{sk_movie_id}/reviews']['get']['parameters']['query']
>;
