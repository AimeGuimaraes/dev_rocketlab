import { useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';

import { useGenres, useMovie, useUpdateMovie } from '../api/hooks';
import { MovieForm } from '../components/movie-form/MovieForm';
import { PageHeader } from '../components/PageHeader';
import { EmptyState, ErrorState } from '../components/StatusMessage';
import { APP_NAME, useDocumentTitle } from '../hooks/useDocumentTitle';
import { type CatalogLinkState, getCatalogSearch } from '../lib/catalogLinkState';
import type { FlashState } from '../lib/flashMessage';
import {
  type MovieDirtyFields,
  type MovieFormOutput,
  movieToFormValues,
  toMovieUpdate,
} from '../lib/movieSchema';

const linkClass =
  'font-medium text-slate-900 underline hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none';

function FormSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-6">
      <div className="h-8 w-2/3 rounded bg-slate-200 sm:w-1/3" />
      <div className="h-72 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-48 rounded-lg bg-slate-200" />
        <div className="h-48 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

export function MovieEditPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Repassa a busca do catálogo de origem para o "Voltar ao catálogo" do detalhe.
  const catalogState: CatalogLinkState = { catalogSearch: getCatalogSearch(location.state) };
  const detailPath = `/filmes/${encodeURIComponent(id)}`;

  const movieQuery = useMovie(id);
  const genresQuery = useGenres();
  const updateMovie = useUpdateMovie(id);

  const movie = movieQuery.data;
  const genres = genresQuery.data;
  const notFound = movieQuery.error?.status === 404;

  useDocumentTitle(
    movie
      ? `Editar: ${movie.titulo} · ${APP_NAME}`
      : notFound
        ? `Filme não encontrado · ${APP_NAME}`
        : null,
  );

  // O detalhe traz os gêneros por nome; o PATCH espera ids. Só preenche com os dois carregados.
  const defaultValues = useMemo(
    () => (movie && genres ? movieToFormValues(movie, genres) : null),
    [movie, genres],
  );

  async function save(values: MovieFormOutput, dirtyFields: MovieDirtyFields) {
    await updateMovie.mutateAsync(toMovieUpdate(values, dirtyFields));
    const state: CatalogLinkState & FlashState = { ...catalogState, flash: 'Alterações salvas.' };
    await navigate(detailPath, { replace: true, state });
  }

  if (!movie) {
    if (movieQuery.isPending) {
      return (
        <>
          <p className="sr-only" role="status">
            Carregando filme…
          </p>
          <FormSkeleton />
        </>
      );
    }
    if (notFound) {
      return (
        <EmptyState title="Filme não encontrado">
          <p>O filme que você quer editar não existe ou foi removido.</p>
          <Link to="/" className={`mt-3 inline-block ${linkClass}`}>
            Voltar ao catálogo
          </Link>
        </EmptyState>
      );
    }
    return (
      <ErrorState
        message={movieQuery.error?.detail ?? 'Não foi possível carregar o filme.'}
        onRetry={() => void movieQuery.refetch()}
        retrying={movieQuery.isFetching}
      />
    );
  }

  if (!defaultValues) {
    if (genresQuery.isPending) {
      return (
        <>
          <p className="sr-only" role="status">
            Carregando gêneros…
          </p>
          <FormSkeleton />
        </>
      );
    }
    return (
      <ErrorState
        message="Não foi possível carregar os gêneros para editar o filme."
        onRetry={() => void genresQuery.refetch()}
        retrying={genresQuery.isFetching}
      />
    );
  }

  return (
    <>
      <PageHeader title={`Editar: ${movie.titulo}`}>
        Altere os campos desejados; só o que mudar será salvo.
      </PageHeader>
      <MovieForm
        // Os valores iniciais são fixados na montagem; um refetch em segundo plano não os troca.
        key={movie.sk_movie_id}
        mode="edit"
        defaultValues={defaultValues}
        onSubmit={save}
        cancelTo={detailPath}
        cancelState={catalogState}
        fallbackErrorMessage="Não foi possível salvar as alterações. Tente novamente."
      />
    </>
  );
}
