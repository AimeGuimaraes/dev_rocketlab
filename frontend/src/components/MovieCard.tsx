import { useState } from 'react';
import { Link } from 'react-router';

import type { MovieListItem } from '../api/types';
import { translateGenre } from '../lib/genres';
import { RatingDisplay } from './RatingDisplay';

const MAX_GENRES = 3;

/** Até duas iniciais do título, para o poster de reserva. */
function initials(title: string): string {
  const words = title.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function FilmIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className="size-8"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

function Poster({ title, url }: { title: string; url: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        aria-hidden="true"
        className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500"
      >
        <FilmIcon />
        <span className="text-2xl font-bold tracking-wide">{initials(title)}</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Pôster de ${title}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}

interface MovieCardProps {
  movie: MovieListItem;
}

/** Card do catálogo; o card inteiro leva ao detalhe do filme. */
export function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link
      to={`/filmes/${encodeURIComponent(movie.sk_movie_id)}`}
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
