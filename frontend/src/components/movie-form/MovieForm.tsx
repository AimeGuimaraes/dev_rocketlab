import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useId } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Link, type To } from 'react-router';

import { applyServerErrors } from '../../lib/formErrors';
import {
  errorClass,
  hintClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textFieldClass,
} from '../../lib/formStyles';
import {
  ANO_MAX,
  ANO_MIN,
  DURACAO_MIN,
  isHttpUrl,
  MOVIE_FORM_FIELDS,
  type MovieDirtyFields,
  type MovieFormOutput,
  type MovieFormValues,
  movieSchema,
  SINOPSE_MAX_LENGTH,
  TITULO_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '../../lib/movieSchema';
import { Poster } from '../Poster';
import { DirectorsField } from './DirectorsField';
import { GenresField } from './GenresField';

type FieldName = (typeof MOVIE_FORM_FIELDS)[number];
type TextFieldName = Exclude<FieldName, 'diretores' | 'genre_ids'>;

const cardClass = 'rounded-lg bg-white p-4 ring-1 ring-slate-200 sm:p-6';
const sectionTitleClass = 'mb-4 text-base font-semibold text-slate-900';

interface MovieFormProps {
  mode: 'create' | 'edit';
  defaultValues: MovieFormValues;
  /** Envia os dados; se rejeitar, o erro é mostrado no formulário. */
  onSubmit: (values: MovieFormOutput, dirtyFields: MovieDirtyFields) => Promise<void>;
  /** Destino do "Cancelar". */
  cancelTo: To;
  cancelState?: unknown;
  /** Mensagem para erros que não vieram da API. */
  fallbackErrorMessage: string;
}

/** Formulário de cadastro e edição de filme. */
export function MovieForm({
  mode,
  defaultValues,
  onSubmit,
  cancelTo,
  cancelState,
  fallbackErrorMessage,
}: MovieFormProps) {
  const id = useId();
  const fieldId = (field: FieldName) => `${id}-${field}`;
  const errorId = (field: FieldName) => `${id}-${field}-erro`;
  const ids = {
    sinopseCounter: `${id}-sinopse-contador`,
    duracaoHint: `${id}-duracao-dica`,
    urlHint: `${id}-url-dica`,
    noChanges: `${id}-sem-alteracoes`,
  };

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<MovieFormValues, unknown, MovieFormOutput>({
    resolver: zodResolver(movieSchema),
    defaultValues,
  });

  const [titulo, sinopse, urlPoster] = useWatch({
    control,
    name: ['titulo', 'sinopse', 'url_poster'],
  });
  const posterUrl = urlPoster.trim();
  const previewUrl = posterUrl.length <= URL_MAX_LENGTH && isHttpUrl(posterUrl) ? posterUrl : null;

  async function submit(values: MovieFormOutput) {
    try {
      await onSubmit(values, dirtyFields);
    } catch (error) {
      applyServerErrors(error, setError, MOVIE_FORM_FIELDS, fallbackErrorMessage);
    }
  }

  function describedBy(field: FieldName, ...extra: string[]): string | undefined {
    const parts = [...extra, ...(errors[field] ? [errorId(field)] : [])];
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  function fieldError(field: TextFieldName): ReactNode {
    const message = errors[field]?.message;
    return (
      message && (
        <p id={errorId(field)} className={errorClass}>
          {message}
        </p>
      )
    );
  }

  /** Atributos comuns de acessibilidade e estilo de um campo de texto. */
  function textInputProps(field: TextFieldName, ...extraDescribedBy: string[]) {
    return {
      id: fieldId(field),
      'aria-invalid': errors[field] ? true : undefined,
      'aria-describedby': describedBy(field, ...extraDescribedBy),
      className: textFieldClass(Boolean(errors[field])),
    };
  }

  // Um nome inválido da lista pode vir só como erro de item (`diretores.N`).
  const diretoresError = errors.diretores
    ? (errors.diretores.message ?? 'Revise os nomes dos diretores.')
    : undefined;
  const serverError = errors.root?.server?.message;
  const blockedByNoChanges = mode === 'edit' && !isDirty;
  const sinopseOverLimit = sinopse.length > SINOPSE_MAX_LENGTH;

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="flex flex-col gap-6"
    >
      <section aria-labelledby={`${id}-info`} className={cardClass}>
        <h2 id={`${id}-info`} className={sectionTitleClass}>
          Informações
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor={fieldId('titulo')} className={labelClass}>
              Título <span className="font-normal text-slate-500">(obrigatório)</span>
            </label>
            <input
              type="text"
              maxLength={TITULO_MAX_LENGTH}
              aria-required="true"
              {...textInputProps('titulo')}
              {...register('titulo')}
            />
            {fieldError('titulo')}
          </div>

          <div>
            <label htmlFor={fieldId('ano_lancamento')} className={labelClass}>
              Ano de lançamento
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={ANO_MIN}
              max={ANO_MAX}
              step={1}
              placeholder="Ex.: 2024"
              {...textInputProps('ano_lancamento')}
              {...register('ano_lancamento')}
            />
            {fieldError('ano_lancamento')}
          </div>

          <div>
            <label htmlFor={fieldId('duracao_minutos')} className={labelClass}>
              Duração
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={DURACAO_MIN}
              step={1}
              placeholder="Ex.: 120"
              {...textInputProps('duracao_minutos', ids.duracaoHint)}
              {...register('duracao_minutos')}
            />
            <p id={ids.duracaoHint} className={hintClass}>
              Em minutos.
            </p>
            {fieldError('duracao_minutos')}
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label htmlFor={fieldId('data_lancamento')} className={labelClass}>
              Data de lançamento
            </label>
            <input
              type="date"
              {...textInputProps('data_lancamento')}
              {...register('data_lancamento')}
            />
            {fieldError('data_lancamento')}
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor={fieldId('sinopse')} className={labelClass}>
              Sinopse
            </label>
            <textarea
              rows={5}
              maxLength={SINOPSE_MAX_LENGTH}
              {...textInputProps('sinopse', ids.sinopseCounter)}
              className={`${textFieldClass(Boolean(errors.sinopse))} resize-y`}
              {...register('sinopse')}
            />
            <div className="mt-1 flex items-start justify-between gap-3">
              {fieldError('sinopse') ?? <span />}
              <p
                id={ids.sinopseCounter}
                className={`shrink-0 text-sm tabular-nums ${
                  sinopseOverLimit ? 'font-medium text-red-700' : 'text-slate-500'
                }`}
              >
                <span className="sr-only">Caracteres usados: </span>
                {sinopse.length}/{SINOPSE_MAX_LENGTH}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <Controller
            control={control}
            name="diretores"
            render={({ field }) => (
              <DirectorsField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={diretoresError}
              />
            )}
          />
        </div>
        <div className={cardClass}>
          <Controller
            control={control}
            name="genre_ids"
            render={({ field }) => (
              <GenresField
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={errors.genre_ids?.message}
              />
            )}
          />
        </div>
      </div>

      <section aria-labelledby={`${id}-imagens`} className={cardClass}>
        <h2 id={`${id}-imagens`} className={sectionTitleClass}>
          Imagens
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <p id={ids.urlHint} className="text-sm text-slate-500">
              Endereços completos, começando com http:// ou https://.
            </p>
            <div>
              <label htmlFor={fieldId('url_poster')} className={labelClass}>
                URL do pôster
              </label>
              <input
                type="url"
                inputMode="url"
                maxLength={URL_MAX_LENGTH}
                placeholder="https://…"
                {...textInputProps('url_poster', ids.urlHint)}
                {...register('url_poster')}
              />
              {fieldError('url_poster')}
            </div>
            <div>
              <label htmlFor={fieldId('url_backdrop')} className={labelClass}>
                URL da imagem de fundo
              </label>
              <input
                type="url"
                inputMode="url"
                maxLength={URL_MAX_LENGTH}
                placeholder="https://…"
                {...textInputProps('url_backdrop', ids.urlHint)}
                {...register('url_backdrop')}
              />
              {fieldError('url_backdrop')}
            </div>
          </div>

          <figure className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start">
            <div className="aspect-[2/3] w-32 overflow-hidden rounded-lg bg-slate-200 shadow-sm ring-1 ring-slate-200 sm:w-40">
              {/* A `key` reinicia o estado de "imagem quebrada" quando a URL muda. */}
              <Poster
                key={previewUrl ?? ''}
                title={titulo.trim() || 'Novo filme'}
                url={previewUrl}
                loading="eager"
              />
            </div>
            <figcaption className="text-xs text-slate-500">Prévia do pôster</figcaption>
          </figure>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        {serverError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {serverError}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isSubmitting || blockedByNoChanges}
            aria-describedby={blockedByNoChanges ? ids.noChanges : undefined}
            className={primaryButtonClass}
          >
            {isSubmitting ? 'Salvando…' : 'Salvar'}
          </button>
          {/* `replace`: voltar no navegador não reabre o formulário abandonado. */}
          <Link to={cancelTo} state={cancelState} replace className={secondaryButtonClass}>
            Cancelar
          </Link>
          {blockedByNoChanges && (
            <p id={ids.noChanges} className="text-sm text-slate-500">
              Nenhuma alteração para salvar.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
