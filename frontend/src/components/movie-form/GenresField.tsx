import { type RefCallback, useId, useMemo } from 'react';

import { useGenres } from '../../api/hooks';
import { errorClass } from '../../lib/formStyles';
import { toGenreOptions } from '../../lib/genres';

interface GenresFieldProps {
  /** `sk_genre_id` marcados, sempre na ordem das opções. */
  value: string[];
  onChange: (value: string[]) => void;
  onBlur: () => void;
  error?: string;
  /** Recebe o primeiro checkbox, para o formulário focar o grupo quando houver erro. */
  inputRef?: RefCallback<HTMLInputElement>;
}

/** Seleção múltipla de gêneros com checkboxes (nomes em pt-BR, em ordem alfabética). */
export function GenresField({ value, onChange, onBlur, error, inputRef }: GenresFieldProps) {
  const id = useId();
  const errorId = `${id}-erro`;
  const { data, isPending, isError, isFetching, refetch } = useGenres();
  const options = useMemo(() => toGenreOptions(data ?? []), [data]);

  function toggle(genreId: string, checked: boolean) {
    const selected = new Set(value);
    if (checked) selected.add(genreId);
    else selected.delete(genreId);
    // Ordem fixa: marcar e desmarcar de volta não conta como alteração.
    onChange(options.filter((option) => selected.has(option.id)).map((option) => option.id));
  }

  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      className="flex min-w-0 flex-col gap-3"
    >
      <legend className="text-base font-semibold text-slate-900">Gêneros</legend>

      {isPending ? (
        <p role="status" className="text-sm text-slate-500">
          Carregando gêneros…
        </p>
      ) : isError && options.length === 0 ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-800">
          <p>Não foi possível carregar os gêneros.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-md bg-white px-3 py-1.5 font-medium text-red-800 ring-1 ring-red-300 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:outline-none disabled:opacity-60"
          >
            {isFetching ? 'Tentando…' : 'Tentar novamente'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {options.map((option, index) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm text-slate-900 hover:bg-slate-50"
            >
              <input
                ref={index === 0 ? inputRef : undefined}
                type="checkbox"
                checked={value.includes(option.id)}
                onChange={(event) => toggle(option.id, event.target.checked)}
                onBlur={onBlur}
                className="size-4 shrink-0 cursor-pointer rounded accent-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}

      {error && (
        <p id={errorId} className={errorClass}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
