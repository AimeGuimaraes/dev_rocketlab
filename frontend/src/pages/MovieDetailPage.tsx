import { useEffect, useRef } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';

import { useMovie } from '../api/hooks';
import { FlashBanner } from '../components/FlashBanner';
import { CrewSection } from '../components/movie-detail/CrewSection';
import { DeleteMovieButton } from '../components/movie-detail/DeleteMovieButton';
import { DetailSection } from '../components/movie-detail/DetailSection';
import { MovieDetailSkeleton } from '../components/movie-detail/MovieDetailSkeleton';
import { MovieHero } from '../components/movie-detail/MovieHero';
import { PerformanceSection } from '../components/movie-detail/PerformanceSection';
import { ReviewForm } from '../components/movie-detail/ReviewForm';
import { ReviewList } from '../components/movie-detail/ReviewList';
import { EmptyState, ErrorState } from '../components/StatusMessage';
import { APP_NAME, useDocumentTitle } from '../hooks/useDocumentTitle';
import { type CatalogLinkState, getCatalogSearch } from '../lib/catalogLinkState';
import { prefersReducedMotion } from '../lib/motion';
import { parsePageParam } from '../lib/searchParams';

/** Parâmetro da URL com a página das avaliações. */
const REVIEWS_PARAM = 'avaliacoes';

const linkClass =
  'font-medium text-slate-900 underline hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none';
const backLinkClass =
  'inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-slate-700 hover:text-slate-900 hover:underline focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none';
const editLinkClass =
  'inline-flex min-h-11 items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-300 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none';

export function MovieDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewsRef = useRef<HTMLDivElement>(null);

  const rawReviewPage = searchParams.get(REVIEWS_PARAM);
  const reviewPage = parsePageParam(rawReviewPage);

  // Sem state (link direto, recarga em outra aba), o "Voltar" leva ao catálogo sem filtros.
  const catalogState: CatalogLinkState = { catalogSearch: getCatalogSearch(location.state) };
  const backTo = { pathname: '/', search: catalogState.catalogSearch };

  const { data: movie, error, isPending, isFetching, refetch } = useMovie(id);
  const notFound = error?.status === 404;

  useDocumentTitle(
    movie
      ? `${movie.titulo} · ${APP_NAME}`
      : notFound
        ? `Filme não encontrado · ${APP_NAME}`
        : null,
  );

  // Corrige `?avaliacoes=` inválido sem criar entrada no histórico; mantém o state do "Voltar".
  const locationState: unknown = location.state;
  useEffect(() => {
    if (rawReviewPage !== null && rawReviewPage !== String(reviewPage)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(REVIEWS_PARAM, String(reviewPage));
          return next;
        },
        { replace: true, state: locationState },
      );
    }
  }, [rawReviewPage, reviewPage, setSearchParams, locationState]);

  function goToReviewPage(target: number) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set(REVIEWS_PARAM, String(target));
        return next;
      },
      { state: locationState },
    );
    reviewsRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  // Depois de publicar, volta à primeira página para a nova avaliação aparecer no topo.
  function resetReviewPage() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(REVIEWS_PARAM);
        return next;
      },
      { replace: true, state: locationState },
    );
  }

  const backLink = (
    <Link to={backTo} className={backLinkClass}>
      <span aria-hidden="true">←</span> Voltar ao catálogo
    </Link>
  );

  if (isPending) {
    return (
      <>
        <div className="mb-4">{backLink}</div>
        <p className="sr-only" role="status">
          Carregando filme…
        </p>
        <MovieDetailSkeleton />
      </>
    );
  }

  // Com o filme já carregado, um erro de refetch em segundo plano não substitui a página.
  if (!movie) {
    if (notFound) {
      return (
        <EmptyState title="Filme não encontrado" as="h1">
          <p>O filme que você procura não existe ou foi removido.</p>
          <Link to={backTo} className={`mt-3 inline-block ${linkClass}`}>
            Voltar ao catálogo
          </Link>
        </EmptyState>
      );
    }
    return (
      <>
        <div className="mb-4">{backLink}</div>
        <ErrorState
          message={error?.detail ?? 'Não foi possível carregar o filme.'}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </>
    );
  }

  return (
    <>
      {/* Fora do `gap`: sem mensagem, a região vazia não ocupa espaço. */}
      <FlashBanner />

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backLink}
          <div className="flex items-center gap-2">
            <Link
              to={`/filmes/${encodeURIComponent(movie.sk_movie_id)}/editar`}
              state={catalogState}
              className={editLinkClass}
            >
              Editar
            </Link>
            <DeleteMovieButton
              movieId={movie.sk_movie_id}
              title={movie.titulo}
              catalogSearch={catalogState.catalogSearch}
            />
          </div>
        </div>

        <MovieHero movie={movie} />

        <DetailSection title="Sinopse">
          {movie.sinopse?.trim() ? (
            <p className="leading-relaxed whitespace-pre-line text-slate-700">{movie.sinopse}</p>
          ) : (
            <p className="text-slate-500">Sinopse não disponível.</p>
          )}
        </DetailSection>

        <CrewSection movie={movie} />

        {movie.performance && <PerformanceSection performance={movie.performance} />}

        <div ref={reviewsRef} className="scroll-mt-4">
          <DetailSection title="Avaliações">
            <div className="flex flex-col gap-6">
              <ReviewForm
                key={movie.sk_movie_id}
                movieId={movie.sk_movie_id}
                onPublished={resetReviewPage}
              />
              <ReviewList
                movieId={movie.sk_movie_id}
                page={reviewPage}
                onPageChange={goToReviewPage}
              />
            </div>
          </DetailSection>
        </div>
      </div>
    </>
  );
}
