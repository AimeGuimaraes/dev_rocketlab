import { describe, expect, it } from 'vitest';

import {
  MAX_QUERY_LENGTH,
  normalizeYear,
  parseCatalogParams,
  toMovieListParams,
  withChanges,
} from './catalogParams';

function parse(query: string) {
  return parseCatalogParams(new URLSearchParams(query));
}

describe('parseCatalogParams', () => {
  it('usa os padrões quando a URL está vazia', () => {
    expect(parse('')).toEqual({
      q: '',
      genreId: '',
      year: '',
      sort: 'popularidade',
      order: 'desc',
      hasExplicitOrder: false,
    });
  });

  it('lê busca, gênero, ano, ordenação e direção válidos', () => {
    expect(parse('q=%20coruja%20&genre_id=g-drama&year=2021&sort=titulo&order=desc')).toEqual({
      q: 'coruja',
      genreId: 'g-drama',
      year: '2021',
      sort: 'titulo',
      order: 'desc',
      hasExplicitOrder: true,
    });
  });

  it('ignora ordenação, direção e ano inválidos', () => {
    const state = parse('sort=orcamento&order=up&year=20a1');
    expect(state.sort).toBe('popularidade');
    expect(state.order).toBe('desc');
    expect(state.hasExplicitOrder).toBe(false);
    expect(state.year).toBe('');
  });

  it('ignora anos fora de 1800–2100', () => {
    expect(parse('year=1799').year).toBe('');
    expect(parse('year=2101').year).toBe('');
    expect(parse('year=1800').year).toBe('1800');
  });

  it('usa a direção padrão do campo de ordenação quando `order` não vem', () => {
    expect(parse('sort=titulo').order).toBe('asc');
    expect(parse('sort=nota_media').order).toBe('desc');
  });

  it('limita a busca ao tamanho aceito pela API', () => {
    const long = 'a'.repeat(MAX_QUERY_LENGTH + 50);
    expect(parse(`q=${long}`).q).toHaveLength(MAX_QUERY_LENGTH);
  });
});

describe('normalizeYear', () => {
  it('distingue vazio, válido e inválido', () => {
    expect(normalizeYear('  ')).toBe('');
    expect(normalizeYear(' 1999 ')).toBe('1999');
    expect(normalizeYear('99')).toBeNull();
  });
});

describe('toMovieListParams', () => {
  it('omite os valores padrão', () => {
    expect(toMovieListParams(parse(''), 1, 20)).toEqual({ page: 1, page_size: 20 });
  });

  it('envia só os filtros aplicados, com o ano como número', () => {
    expect(toMovieListParams(parse('q=coruja&year=2021&sort=titulo&order=desc'), 2, 20)).toEqual({
      page: 2,
      page_size: 20,
      q: 'coruja',
      year: 2021,
      sort: 'titulo',
      order: 'desc',
    });
  });
});

describe('withChanges', () => {
  it('grava e remove chaves, mantém as demais e volta para a página 1', () => {
    const prev = new URLSearchParams('q=coruja&year=2021&page=3&extra=1');
    const next = withChanges(prev, { q: 'noite', year: null });
    expect(next.get('q')).toBe('noite');
    expect(next.has('year')).toBe(false);
    expect(next.has('page')).toBe(false);
    expect(next.get('extra')).toBe('1');
  });

  it('trata string vazia como remoção e não altera a URL original', () => {
    const prev = new URLSearchParams('genre_id=g-drama&page=2');
    const next = withChanges(prev, { genre_id: '' });
    expect(next.toString()).toBe('');
    expect(prev.toString()).toBe('genre_id=g-drama&page=2');
  });

  it('remove `page` mesmo sem alterações de filtro', () => {
    expect(withChanges(new URLSearchParams('page=4&sort=titulo'), {}).toString()).toBe(
      'sort=titulo',
    );
  });
});
