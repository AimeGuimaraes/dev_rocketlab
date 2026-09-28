import { Link, useLocation } from 'react-router';

import type { MovieListItem } from '../api/types';
import type { CatalogLinkState } from '../lib/catalogLinkState';
import { translateGenre } from '../lib/genres';
import { Poster } from './Poster';
import { RatingDisplay } from './RatingDisplay';

const MAX_GENRES = 3;

interface MovieCardProps {
  movie: MovieListItem;
}

/**
 * Card do catálogo; o card inteiro leva ao detalhe do filme, levando junto a busca atual do
 * catálogo para que o "Voltar" do detalhe restaure filtros e página.
 */
export function MovieCard({ movie }: MovieCardProps) {
  const location = useLocation();
  const state: CatalogLinkState = { catalogSearch: location.search };

  return (
    <Link
      to={`/filmes/${encodeURIComponent(movie.sk_movie_id)}`}
      state={state}
      className="group block h-full rounded-lg bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
    >
      <article className="flex h-full flex-col">
        <div className="aspect-[2/3] overflow-hidden rounded-t-lg bg-slate-200">
          <Poster title={movie.titulo} url={movie.url_poster} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <h2 className="line-clamp-2 leading-snug font-semibold text-slate-900 group-hover:underline">
            {movie.titulo}
          </h2>
          <p className="text-sm text-slate-600">{movie.ano_lancamento ?? 'Ano desconhecido'}</p>
          {movie.generos.length > 0 && (
            <ul className="flex flex-wrap gap-1" aria-label="Gêneros">
              {movie.generos.slice(0, MAX_GENRES).map((genre) => (
                <li
                  key={genre}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                >
                  {translateGenre(genre)}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto pt-1">
            <RatingDisplay size="sm" value={movie.nota_media} count={movie.qtd_avaliacoes} />
          </div>
        </div>
      </article>
    </Link>
  );
}

/** Placeholder com o mesmo formato do card, exibido enquanto o catálogo carrega. */
export function MovieCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full animate-pulse flex-col rounded-lg bg-white shadow-sm ring-1 ring-slate-200"
    >
      <div className="aspect-[2/3] rounded-t-lg bg-slate-200" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-4 w-4/5 rounded bg-slate-200" />
        <div className="h-3 w-1/3 rounded bg-slate-200" />
        <div className="flex gap-1">
          <div className="h-4 w-12 rounded-full bg-slate-200" />
          <div className="h-4 w-14 rounded-full bg-slate-200" />
        </div>
        <div className="h-3.5 w-2/3 rounded bg-slate-200" />
      </div>
    </div>
  );
}
