import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';

import { useMovies } from '../api/hooks';
import { MovieCard, MovieCardSkeleton } from '../components/MovieCard';
import { MovieGrid } from '../components/MovieGrid';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState } from '../components/StatusMessage';
import { formatInteger } from '../lib/format';

const PAGE_SIZE = 20;

const linkClass = 'font-medium text-slate-900 underline hover:text-slate-600';

/** Lê `?page=` da URL; qualquer valor que não seja um inteiro ≥ 1 vira a página 1. */
function parsePage(raw: string | null): number {
  if (raw === null || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = searchParams.get('page');
  const page = parsePage(rawPage);

  // Corrige a URL quando `page` é inválida (0, negativa, texto), sem criar entrada no histórico.
  useEffect(() => {
    if (rawPage !== null && rawPage !== String(page)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('page', String(page));
          return next;
        },
        { replace: true },
      );
    }
  }, [rawPage, page, setSearchParams]);

  // Vale também para voltar/avançar do navegador, que mudam a página sem passar por goToPage.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  const { data, error, isPending, isPlaceholderData, isFetching, refetch } = useMovies({
    page,
    page_size: PAGE_SIZE,
  });

  function goToPage(target: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(target));
      return next;
    });
  }

  function renderContent() {
    if (isPending) {
      return (
        <>
          <p className="sr-only" role="status">
            Carregando catálogo…
          </p>
          <MovieGrid>
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <MovieCardSkeleton key={index} />
            ))}
          </MovieGrid>
        </>
      );
    }

    if (error) {
      return (
        <ErrorState message={error.detail} onRetry={() => void refetch()} retrying={isFetching} />
      );
    }

    if (data.total === 0) {
      return (
        <EmptyState title="Nenhum filme cadastrado">
          <Link to="/filmes/novo" className={linkClass}>
            Cadastrar o primeiro filme
          </Link>
        </EmptyState>
      );
    }

    if (data.items.length === 0) {
      return (
        <EmptyState title="Página não encontrada">
          <p>
            O catálogo tem {formatInteger(data.pages)} {data.pages === 1 ? 'página' : 'páginas'}.
          </p>
          <Link to="/?page=1" className={`${linkClass} mt-2 inline-block`}>
            Ir para a página 1
          </Link>
        </EmptyState>
      );
    }

    return (
      <>
        <MovieGrid busy={isPlaceholderData}>
          {data.items.map((movie) => (
            <MovieCard key={movie.sk_movie_id} movie={movie} />
          ))}
        </MovieGrid>
        {data.pages > 1 && (
          <Pagination
            page={page}
            pages={data.pages}
            total={data.total}
            itemLabel={['filme', 'filmes']}
            onPageChange={goToPage}
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Catálogo de filmes" />
      {renderContent()}
    </>
  );
}
