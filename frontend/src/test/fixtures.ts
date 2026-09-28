import type {
  Genre,
  MovieDetail,
  MovieListItem,
  MoviePerformance,
  Page,
  ReviewCreated,
  ReviewRead,
} from '../api/types';

/** Dados fictícios usados pelos handlers do MSW e pelos testes. */

export const genres: Genre[] = [
  { sk_genre_id: 'g-action', nome_genero: 'Action' },
  { sk_genre_id: 'g-drama', nome_genero: 'Drama' },
  { sk_genre_id: 'g-scifi', nome_genero: 'Science Fiction' },
  { sk_genre_id: 'g-comedy', nome_genero: 'Comedy' },
];

export function makeMovie(overrides: Partial<MovieListItem> = {}): MovieListItem {
  return {
    sk_movie_id: 'm-000',
    titulo: 'Filme Fictício',
    ano_lancamento: 2020,
    url_poster: null,
    generos: ['Drama'],
    nota_media: 7.5,
    qtd_avaliacoes: 10,
    ...overrides,
  };
}

/** 25 filmes: com 20 por página, o catálogo tem 2 páginas. */
export const movies: MovieListItem[] = [
  makeMovie({
    sk_movie_id: 'm-001',
    titulo: 'O Voo da Coruja',
    ano_lancamento: 2021,
    generos: ['Action', 'Science Fiction'],
    nota_media: 8.4,
    qtd_avaliacoes: 3,
  }),
  makeMovie({
    sk_movie_id: 'm-002',
    titulo: 'Noite de Tempestade',
    ano_lancamento: 1999,
    nota_media: null,
    qtd_avaliacoes: 0,
  }),
  ...Array.from({ length: 23 }, (_, index) => {
    const number = String(index + 3).padStart(3, '0');
    return makeMovie({ sk_movie_id: `m-${number}`, titulo: `Filme Fictício ${number}` });
  }),
];

export const movieDetail: MovieDetail = {
  sk_movie_id: 'm-001',
  id_filme: 'app-abc123',
  titulo: 'O Voo da Coruja',
  data_lancamento: '2021-12-16',
  ano_lancamento: 2021,
  duracao_minutos: 0,
  status_filme: 'Released',
  sinopse: 'Uma coruja atravessa o país.',
  url_poster: 'https://example.com/poster.jpg',
  url_backdrop: null,
  generos: ['Science Fiction', 'Action'],
  diretores: ['Fulana de Tal', ' fulana de tal ', 'Beltrano'],
  roteiristas: [],
  elenco: [],
  produtoras: [],
  performance: null,
  nota_media: 8.4,
  qtd_avaliacoes: 3,
};

export const moviePerformance: MoviePerformance = {
  orcamento_usd: 1_500_000,
  receita_usd: 1_200_000,
  lucro_usd: -300_000,
  orcamento_brl: 7_500_000,
  receita_brl: null,
  lucro_brl: -1_500_000,
  popularidade: 123.456,
  nota_tmdb: 7.8,
  qtd_tmdb: 12_345,
  nota_imdb: null,
  qtd_imdb: null,
};

/** Detalhe a partir de `movieDetail`, com os campos sobrescritos. */
export function makeMovieDetail(overrides: Partial<MovieDetail> = {}): MovieDetail {
  return { ...movieDetail, ...overrides };
}

export const review: ReviewRead = {
  sk_movie_review_id: 'r-001',
  nome: 'Ana',
  nota: 8.5,
  comentario: 'Roteiro excelente.',
  created_at: '2026-09-27T15:30:00Z',
};

export function makeReviewCreated(overrides: Partial<ReviewRead> = {}): ReviewCreated {
  return {
    avaliacao: { ...review, ...overrides },
    nota_media: 8.4,
    qtd_avaliacoes: 4,
  };
}

/** Recorta uma página no formato da API a partir da lista completa. */
export function makePage<T>(items: readonly T[], page = 1, pageSize = 20): Page<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    page_size: pageSize,
    pages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}
