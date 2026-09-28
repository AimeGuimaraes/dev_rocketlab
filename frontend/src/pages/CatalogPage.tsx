import { useCallback, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';

import { useGenres, useMovies } from '../api/hooks';
import type { MovieSort } from '../api/types';
import { CatalogFilters } from '../components/CatalogFilters';
import { FlashBanner } from '../components/FlashBanner';
import { MovieCard, MovieCardSkeleton } from '../components/MovieCard';
import { MovieGrid } from '../components/MovieGrid';
import { PageHeader } from '../components/PageHeader';
import { Pagination } from '../components/Pagination';
import { SearchBar } from '../components/SearchBar';
import { EmptyState, ErrorState } from '../components/StatusMessage';
import type { DraftFieldHandle } from '../hooks/useDebouncedDraft';
import {
  DEFAULT_SORT,
  defaultOrderFor,
  FILTER_KEYS,
  type FilterChanges,
  hasActiveFilters,
  isCustomSort,
  parseCatalogParams,
  toMovieListParams,
  withChanges,
} from '../lib/catalogParams';
import { formatInteger } from '../lib/format';
import { translateGenre } from '../lib/genres';
import { parsePageParam } from '../lib/searchParams';

const PAGE_SIZE = 20;

const linkClass = 'font-medium text-slate-900 underline hover:text-slate-600';
const buttonClass =
  'mt-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPage = searchParams.get('page');
  const page = parsePageParam(rawPage);
  const filters = parseCatalogParams(searchParams);
  const filtered = hasActiveFilters(filters);
  const canReset = filtered || isCustomSort(filters);
  const searchRef = useRef<DraftFieldHandle>(null);
  const yearRef = useRef<DraftFieldHandle>(null);

  const { data: genres } = useGenres();
  const genreName = genres?.find((genre) => genre.sk_genre_id === filters.genreId)?.nome_genero;

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

  const { data, error, isPending, isPlaceholderData, isFetching, refetch } = useMovies(
    toMovieListParams(filters, page, PAGE_SIZE),
  );

  const updateFilters = useCallback(
    (changes: FilterChanges, replace = false) => {
      setSearchParams((prev) => withChanges(prev, changes), { replace });
    },
    [setSearchParams],
  );

  // Campos digitados: a primeira aplicação (vazio → preenchido) cria entrada no histórico, para
  // "Voltar" retornar ao catálogo anterior; as seguintes a substituem, sem uma entrada por letra.
  const currentQuery = filters.q;
  const currentYear = filters.year;
  const handleSearch = useCallback(
    (q: string) => updateFilters({ q }, currentQuery !== ''),
    [updateFilters, currentQuery],
  );
  const handleYearChange = useCallback(
    (year: string) => updateFilters({ year }, currentYear !== ''),
    [updateFilters, currentYear],
  );

  function handleSortChange(sort: MovieSort) {
    updateFilters({ sort: sort === DEFAULT_SORT ? null : sort, order: null });
  }

  function handleToggleOrder() {
    const order = filters.order === 'asc' ? 'desc' : 'asc';
    updateFilters({ order: order === defaultOrderFor(filters.sort) ? null : order });
  }

  function resetFilters() {
    // Descarta o que foi digitado e ainda aguarda o debounce, para não ser aplicado depois.
    searchRef.current?.reset();
    yearRef.current?.reset();
    updateFilters(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])));
  }

  function goToPage(target: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(target));
      return next;
    });
  }

  function renderSummary() {
    if (!filtered || !data) return null;
    const count = formatInteger(data.total);
    let text = data.total === 1 ? `${count} filme encontrado` : `${count} filmes encontrados`;
    if (filters.q) text += ` para "${filters.q}"`;
    if (filters.genreId && genreName) text += ` em ${translateGenre(genreName)}`;
    if (filters.year) text += ` de ${filters.year}`;
    return <p className="mb-4 text-sm text-slate-600">{text}</p>;
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
      if (filtered) {
        return (
          <EmptyState title="Nenhum filme encontrado">
            <p>Tente outros termos ou remova os filtros.</p>
            <button type="button" onClick={resetFilters} className={buttonClass}>
              Limpar filtros
            </button>
          </EmptyState>
        );
      }
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
            {filtered ? 'O resultado tem' : 'O catálogo tem'} {formatInteger(data.pages)}{' '}
            {data.pages === 1 ? 'página' : 'páginas'}.
          </p>
          <button type="button" onClick={() => goToPage(1)} className={buttonClass}>
            Ir para a página 1
          </button>
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
      <FlashBanner />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end">
        <SearchBar ref={searchRef} value={filters.q} onSearch={handleSearch} />
        <CatalogFilters
          state={filters}
          canReset={canReset}
          yearRef={yearRef}
          onGenreChange={(genreId) => updateFilters({ genre_id: genreId })}
          onYearChange={handleYearChange}
          onSortChange={handleSortChange}
          onToggleOrder={handleToggleOrder}
          onReset={resetFilters}
        />
      </div>
      <div aria-live="polite">{renderSummary()}</div>
      {renderContent()}
    </>
  );
}
