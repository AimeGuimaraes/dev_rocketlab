import { useState } from 'react';

import type { MovieDetail } from '../../api/types';
import { formatDate, formatDuration } from '../../lib/format';
import { translateGenre } from '../../lib/genres';
import { translateStatus } from '../../lib/movieStatus';
import { Poster } from '../Poster';
import { RatingDisplay } from '../RatingDisplay';

interface MovieHeroProps {
  movie: MovieDetail;
}

/** Topo do detalhe: backdrop com gradiente, pôster, título, ficha rápida, gêneros e média. */
export function MovieHero({ movie }: MovieHeroProps) {
  const [backdropFailed, setBackdropFailed] = useState(false);
  const showBackdrop = Boolean(movie.url_backdrop) && !backdropFailed;

  const releaseDate = formatDate(movie.data_lancamento);
  const facts = [
    movie.ano_lancamento?.toString(),
    formatDuration(movie.duracao_minutos),
    movie.status_filme ? translateStatus(movie.status_filme) : null,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <section className="relative overflow-hidden rounded-xl bg-slate-900 text-white shadow-sm">
      {showBackdrop && (
        <>
          <img
            src={movie.url_backdrop ?? undefined}
            alt=""
            decoding="async"
            onError={() => setBackdropFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/40 sm:bg-gradient-to-r sm:from-slate-950 sm:via-slate-950/80 sm:to-slate-950/30"
          />
        </>
      )}

      <div className="relative flex flex-col items-center gap-6 p-5 sm:flex-row sm:items-end sm:p-8">
        <div className="aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-lg bg-slate-200 shadow-lg ring-1 ring-white/10 sm:w-52">
          <Poster title={movie.titulo} url={movie.url_poster} loading="eager" />
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-4xl">
            {movie.titulo}
          </h1>

          {facts.length > 0 && (
            <p className="text-sm text-slate-200 sm:text-base">{facts.join(' · ')}</p>
          )}

          {releaseDate && (
            <p className="text-sm text-slate-300">
              Lançamento: <time dateTime={movie.data_lancamento ?? undefined}>{releaseDate}</time>
            </p>
          )}

          {movie.generos.length > 0 && (
            <ul
              className="flex flex-wrap justify-center gap-1.5 sm:justify-start"
              aria-label="Gêneros"
            >
              {movie.generos.map((genre) => (
                <li
                  key={genre}
                  className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-white/20"
                >
                  {translateGenre(genre)}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-1 flex justify-center sm:justify-start">
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <RatingDisplay
                size="md"
                value={movie.nota_media}
                count={movie.qtd_avaliacoes}
                showCount
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
