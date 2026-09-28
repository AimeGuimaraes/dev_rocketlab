import type { MovieListParams, MovieSort, SortOrder } from '../api/types';

/** Mesmo limite de `q` aceito pelo backend. */
export const MAX_QUERY_LENGTH = 200;
export const MIN_YEAR = 1800;
export const MAX_YEAR = 2100;

export const DEFAULT_SORT: MovieSort = 'popularidade';

interface SortOption {
  value: MovieSort;
  label: string;
  /** Direção usada quando `order` não está na URL (igual ao padrão do backend). */
  defaultOrder: SortOrder;
}

export const SORT_OPTIONS: readonly SortOption[] = [
  { value: 'popularidade', label: 'Mais populares', defaultOrder: 'desc' },
  { value: 'titulo', label: 'Título (A–Z)', defaultOrder: 'asc' },
  { value: 'ano_lancamento', label: 'Mais recentes', defaultOrder: 'desc' },
  { value: 'nota_media', label: 'Mais bem avaliados', defaultOrder: 'desc' },
];

const SORT_ORDERS: readonly SortOrder[] = ['asc', 'desc'];

/** Chaves da URL controladas pela busca, pelos filtros e pela ordenação. */
export const FILTER_KEYS = ['q', 'genre_id', 'year', 'sort', 'order'] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

/** Alterações na URL: string não vazia grava a chave; vazio ou `null` a remove. */
export type FilterChanges = Partial<Record<FilterKey, string | null>>;

export interface CatalogState {
  q: string;
  genreId: string;
  /** Ano válido (1800–2100) como texto, ou vazio. */
  year: string;
  sort: MovieSort;
  /** Direção efetiva: a da URL ou a padrão do campo de ordenação. */
  order: SortOrder;
  /** `order` veio explicitamente na URL. */
  hasExplicitOrder: boolean;
}

function isMovieSort(value: string | null): value is MovieSort {
  return SORT_OPTIONS.some((option) => option.value === value);
}

function isSortOrder(value: string | null): value is SortOrder {
  return SORT_ORDERS.some((order) => order === value);
}

export function defaultOrderFor(sort: MovieSort): SortOrder {
  return SORT_OPTIONS.find((option) => option.value === sort)?.defaultOrder ?? 'desc';
}

/** Busca sem espaços nas pontas e no máximo com o tamanho aceito pela API. */
export function normalizeQuery(raw: string): string {
  return raw.trim().slice(0, MAX_QUERY_LENGTH);
}

/** Ano digitado: `''` (sem filtro), `'AAAA'` válido, ou `null` quando inválido. */
export function normalizeYear(raw: string): string | null {
  const value = raw.trim();
  if (value === '') return '';
  if (!/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= MIN_YEAR && year <= MAX_YEAR ? value : null;
}

/** Lê o estado do catálogo da URL, ignorando valores inválidos. */
export function parseCatalogParams(searchParams: URLSearchParams): CatalogState {
  const rawSort = searchParams.get('sort');
  const rawOrder = searchParams.get('order');
  const sort = isMovieSort(rawSort) ? rawSort : DEFAULT_SORT;
  const hasExplicitOrder = isSortOrder(rawOrder);

  return {
    q: normalizeQuery(searchParams.get('q') ?? ''),
    genreId: searchParams.get('genre_id')?.trim() ?? '',
    year: normalizeYear(searchParams.get('year') ?? '') ?? '',
    sort,
    order: hasExplicitOrder ? rawOrder : defaultOrderFor(sort),
    hasExplicitOrder,
  };
}

/** Parâmetros de `GET /movies`: só o que é válido, para nunca provocar um 422. */
export function toMovieListParams(
  state: CatalogState,
  page: number,
  pageSize: number,
): MovieListParams {
  const params: MovieListParams = { page, page_size: pageSize };
  if (state.q) params.q = state.q;
  if (state.genreId) params.genre_id = state.genreId;
  if (state.year) params.year = Number(state.year);
  if (state.sort !== DEFAULT_SORT) params.sort = state.sort;
  if (state.hasExplicitOrder) params.order = state.order;
  return params;
}

/** Nova URL com as alterações aplicadas; qualquer mudança de filtro volta para a página 1. */
export function withChanges(prev: URLSearchParams, changes: FilterChanges): URLSearchParams {
  const next = new URLSearchParams(prev);
  for (const key of FILTER_KEYS) {
    if (!(key in changes)) continue;
    const value = changes[key];
    if (value) next.set(key, value);
    else next.delete(key);
  }
  next.delete('page');
  return next;
}

/** Busca, gênero ou ano aplicados (a ordenação não conta como filtro). */
export function hasActiveFilters(state: CatalogState): boolean {
  return Boolean(state.q || state.genreId || state.year);
}

/** Ordenação diferente da padrão do catálogo. */
export function isCustomSort(state: CatalogState): boolean {
  return state.sort !== DEFAULT_SORT || state.order !== defaultOrderFor(state.sort);
}
