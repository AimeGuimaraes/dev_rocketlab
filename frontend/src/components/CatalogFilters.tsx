import { type Ref, useId, useImperativeHandle, useMemo } from 'react';

import { useGenres } from '../api/hooks';
import type { MovieSort } from '../api/types';
import { type DraftFieldHandle, useDebouncedDraft } from '../hooks/useDebouncedDraft';
import {
  type CatalogState,
  MAX_YEAR,
  MIN_YEAR,
  normalizeYear,
  SORT_OPTIONS,
} from '../lib/catalogParams';
import { toGenreOptions } from '../lib/genres';

const YEAR_DEBOUNCE_MS = 600;

const labelClass = 'mb-1 block text-sm font-medium text-slate-700';
const controlClass =
  'h-11 w-full rounded-md bg-white px-3 text-slate-900 ring-1 ring-slate-500 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
const buttonClass =
  'inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium whitespace-nowrap text-slate-700 ring-1 ring-slate-300 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none';

function ArrowIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="size-4"
    >
      {direction === 'up' ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
    </svg>
  );
}

function GenreSelect({ value, onChange }: { value: string; onChange: (genreId: string) => void }) {
  const id = useId();
  const { data, isPending, isError } = useGenres();

  const options = useMemo(() => toGenreOptions(data ?? []), [data]);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Gênero
      </label>
      <select
        id={id}
        value={value}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      >
        <option value="">{isPending ? 'Carregando gêneros…' : 'Todos os gêneros'}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {isError && (
        <p className="mt-1 text-xs text-red-700">Não foi possível carregar os gêneros.</p>
      )}
    </div>
  );
}

interface YearInputProps {
  value: string;
  onChange: (year: string) => void;
  ref?: Ref<DraftFieldHandle>;
}

function YearInput({ value, onChange, ref }: YearInputProps) {
  const id = useId();
  const hintId = useId();
  const { draft, setDraft, flush, reset, isValid } = useDebouncedDraft({
    value,
    onCommit: onChange,
    delay: YEAR_DEBOUNCE_MS,
    normalize: normalizeYear,
  });

  useImperativeHandle(ref, () => ({ reset: () => reset() }));

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Ano
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={MIN_YEAR}
        max={MAX_YEAR}
        step={1}
        placeholder="Ex.: 1999"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={flush}
        onKeyDown={(event) => {
          if (event.key === 'Enter') flush();
        }}
        aria-invalid={!isValid}
        aria-describedby={isValid ? undefined : hintId}
        className={`${controlClass} aria-invalid:ring-red-500`}
      />
      {!isValid && (
        <p id={hintId} className="mt-1 text-xs text-red-700">
          Informe um ano entre {MIN_YEAR} e {MAX_YEAR}.
        </p>
      )}
    </div>
  );
}

interface CatalogFiltersProps {
  state: CatalogState;
  /** Há busca, filtro ou ordenação fora do padrão para limpar. */
  canReset: boolean;
  onGenreChange: (genreId: string) => void;
  onYearChange: (year: string) => void;
  onSortChange: (sort: MovieSort) => void;
  onToggleOrder: () => void;
  onReset: () => void;
  /** Controle do campo de ano, para o "Limpar filtros" descartar o que ainda não foi aplicado. */
  yearRef?: Ref<DraftFieldHandle>;
}

/** Filtros por gênero e ano, ordenação e "Limpar filtros" do catálogo. */
export function CatalogFilters({
  state,
  canReset,
  yearRef,
  onGenreChange,
  onYearChange,
  onSortChange,
  onToggleOrder,
  onReset,
}: CatalogFiltersProps) {
  const sortId = useId();
  const isAsc = state.order === 'asc';
  const orderLabel = isAsc ? 'Crescente' : 'Decrescente';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-none lg:items-start">
      <div className="lg:w-48">
        <GenreSelect value={state.genreId} onChange={onGenreChange} />
      </div>
      <div className="lg:w-32">
        <YearInput ref={yearRef} value={state.year} onChange={onYearChange} />
      </div>
      <div className="sm:col-span-2 lg:w-auto">
        <label htmlFor={sortId} className={labelClass}>
          Ordenar por
        </label>
        <div className="flex gap-2">
          <select
            id={sortId}
            value={state.sort}
            onChange={(event) => {
              const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
              if (option) onSortChange(option.value);
            }}
            className={`${controlClass} lg:w-48`}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggleOrder}
            aria-label={`Inverter direção (atual: ${orderLabel.toLowerCase()})`}
            title="Inverter direção"
            className={buttonClass}
          >
            <ArrowIcon direction={isAsc ? 'up' : 'down'} />
            <span className="hidden sm:inline">{orderLabel}</span>
          </button>
        </div>
      </div>
      {canReset && (
        <div className="sm:col-span-2 lg:self-end">
          <button type="button" onClick={onReset} className={`${buttonClass} w-full lg:w-auto`}>
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
