import { http, HttpResponse } from 'msw';

import type {
  ErrorResponse,
  Genre,
  MovieDetail,
  MovieListItem,
  Page,
  ReviewCreated,
  ReviewRead,
} from '../api/types';
import { env } from '../lib/env';
import { genres, makePage, makeReviewCreated, movieDetail, movies, review } from './fixtures';

/** URL absoluta de um endpoint da API, com o mesmo prefixo usado pelo cliente. */
export function apiUrl(path: string): string {
  return `${env.apiUrl}${path}`;
}

/** Resposta de erro no formato `ErrorResponse` do backend. */
export function errorResponse(status: number, body: ErrorResponse) {
  return HttpResponse.json(body, { status });
}

function positiveInt(value: string | null, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

/** Handlers padrão (caminho feliz); cada teste sobrescreve com `server.use(...)`. */
export const handlers = [
  http.get(apiUrl('/genres'), () => HttpResponse.json<Genre[]>(genres)),

  http.get(apiUrl('/movies'), ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLocaleLowerCase('pt-BR') ?? '';
    const page = positiveInt(url.searchParams.get('page'), 1);
    const pageSize = positiveInt(url.searchParams.get('page_size'), 20);
    const found = movies.filter((movie) => movie.titulo.toLocaleLowerCase('pt-BR').includes(q));
    return HttpResponse.json<Page<MovieListItem>>(makePage(found, page, pageSize));
  }),

  http.post(apiUrl('/movies'), () =>
    HttpResponse.json<MovieDetail>({ ...movieDetail, sk_movie_id: 'm-new' }, { status: 201 }),
  ),

  http.get(apiUrl('/movies/:id'), () => HttpResponse.json<MovieDetail>(movieDetail)),

  http.patch(apiUrl('/movies/:id'), () => HttpResponse.json<MovieDetail>(movieDetail)),

  http.get(apiUrl('/movies/:id/reviews'), () =>
    HttpResponse.json<Page<ReviewRead>>(makePage([review])),
  ),

  http.post(apiUrl('/movies/:id/reviews'), () =>
    HttpResponse.json<ReviewCreated>(makeReviewCreated(), { status: 201 }),
  ),

  http.delete(apiUrl('/movies/:id'), () => new HttpResponse(null, { status: 204 })),
];
