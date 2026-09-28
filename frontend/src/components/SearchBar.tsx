import { type Ref, useId, useImperativeHandle, useRef } from 'react';

import { type DraftFieldHandle, useDebouncedDraft } from '../hooks/useDebouncedDraft';
import { MAX_QUERY_LENGTH, normalizeQuery } from '../lib/catalogParams';

const SEARCH_DEBOUNCE_MS = 300;

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="size-5"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

interface SearchBarProps {
  /** Busca aplicada (vinda da URL). */
  value: string;
  onSearch: (value: string) => void;
  /** Permite ao "Limpar filtros" descartar o que foi digitado e ainda não aplicado. */
  ref?: Ref<DraftFieldHandle>;
}

/** Busca por título com debounce; o texto acompanha a URL quando ela muda por fora. */
export function SearchBar({ value, onSearch, ref }: SearchBarProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { draft, setDraft, flush, reset } = useDebouncedDraft({
    value,
    onCommit: onSearch,
    delay: SEARCH_DEBOUNCE_MS,
    normalize: normalizeQuery,
  });

  useImperativeHandle(ref, () => ({ reset: () => reset() }));

  function clear() {
    reset();
    if (value !== '') onSearch('');
    inputRef.current?.focus();
  }

  return (
    <div className="relative flex-1">
      <label htmlFor={inputId} className="sr-only">
        Buscar por título
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={draft}
        maxLength={MAX_QUERY_LENGTH}
        placeholder="Buscar filmes pelo título…"
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') flush();
        }}
        className="h-10 w-full rounded-md bg-white pr-10 pl-10 text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {draft !== '' && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpar busca"
          className="absolute inset-y-0 right-1 my-auto inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
        >
          <ClearIcon />
        </button>
      )}
    </div>
  );
}
