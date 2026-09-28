/** State enviado pelo `MovieCard` ao abrir um filme: a query string do catálogo de origem. */
export interface CatalogLinkState {
  catalogSearch: string;
}

/** Valida o `location.state` (que é `unknown`) e devolve a busca do catálogo, se houver. */
export function getCatalogSearch(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'catalogSearch' in state &&
    typeof state.catalogSearch === 'string' &&
    (state.catalogSearch === '' || state.catalogSearch.startsWith('?'))
  ) {
    return state.catalogSearch;
  }
  return '';
}
