import { type KeyboardEvent, type RefCallback, useId, useRef, useState } from 'react';

import { errorClass, hintClass, labelClass, textFieldClass } from '../../lib/formStyles';
import { DIRETOR_MAX_LENGTH, isSameName } from '../../lib/movieSchema';

interface DirectorsFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  onBlur: () => void;
  /** Erro de validação ou do servidor para a lista. */
  error?: string;
  /** Recebe o campo de texto, para o formulário focar a lista quando houver erro. */
  inputRef?: RefCallback<HTMLInputElement>;
}

const legendClass = 'text-base font-semibold text-slate-900';
const addButtonClass =
  'mt-1 inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-slate-900 ring-1 ring-slate-300 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none';

/** Lista de diretores: campo com "Adicionar" (ou Enter) e chips removíveis. */
export function DirectorsField({
  value,
  onChange,
  onBlur,
  error,
  inputRef: inputRefCallback,
}: DirectorsFieldProps) {
  const id = useId();
  const ids = {
    input: `${id}-nome`,
    hint: `${id}-dica`,
    local: `${id}-aviso`,
    error: `${id}-erro`,
  };

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  function setInputRef(element: HTMLInputElement | null) {
    inputRef.current = element;
    inputRefCallback?.(element);
  }

  function add() {
    const name = draft.trim();
    if (name === '') {
      setLocalError('Digite o nome do diretor antes de adicionar.');
    } else if (name.length > DIRETOR_MAX_LENGTH) {
      setLocalError(`O nome deve ter no máximo ${DIRETOR_MAX_LENGTH} caracteres.`);
    } else if (value.some((existing) => isSameName(existing, name))) {
      setLocalError(`${name} já está na lista.`);
    } else {
      onChange([...value, name]);
      setDraft('');
      setLocalError(null);
      setAnnouncement(`${name} adicionado.`);
    }
    inputRef.current?.focus();
  }

  function remove(index: number) {
    const name = value[index];
    onChange(value.filter((_, position) => position !== index));
    setAnnouncement(`${name} removido.`);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      // Enter adiciona o nome em vez de enviar o formulário.
      event.preventDefault();
      add();
    }
  }

  const describedBy = [ids.hint, localError && ids.local, error && ids.error]
    .filter(Boolean)
    .join(' ');

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className={legendClass}>Diretores</legend>

      <div>
        <label htmlFor={ids.input} className={labelClass}>
          Nome do diretor
        </label>
        <div className="flex gap-2">
          <input
            ref={setInputRef}
            id={ids.input}
            type="text"
            value={draft}
            maxLength={DIRETOR_MAX_LENGTH}
            onChange={(event) => {
              setDraft(event.target.value);
              setLocalError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={onBlur}
            aria-invalid={localError || error ? true : undefined}
            aria-describedby={describedBy}
            className={textFieldClass(Boolean(localError || error))}
          />
          <button type="button" onClick={add} className={addButtonClass}>
            Adicionar
          </button>
        </div>
        <p id={ids.hint} className={hintClass}>
          Pressione Enter ou clique em “Adicionar” para incluir cada nome.
        </p>
        {localError && (
          <p id={ids.local} className={errorClass}>
            {localError}
          </p>
        )}
        {error && (
          <p id={ids.error} className={errorClass}>
            {error}
          </p>
        )}
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Diretores adicionados">
          {value.map((name, index) => (
            <li
              key={name}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 py-1 pr-1 pl-3 text-sm text-slate-900 ring-1 ring-slate-200"
            >
              <span className="truncate">{name}</span>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remover ${name}`}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Nenhum diretor adicionado.</p>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </fieldset>
  );
}
