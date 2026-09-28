import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useCreateReview } from '../../api/hooks';
import { formatRating } from '../../lib/format';
import { applyServerErrors } from '../../lib/formErrors';
import { errorClass, labelClass, primaryButtonClass, textFieldClass } from '../../lib/formStyles';
import {
  COMENTARIO_MAX_LENGTH,
  NOME_MAX_LENGTH,
  NOTA_MAX,
  NOTA_MIN,
  NOTA_STEP,
  type ReviewFormOutput,
  type ReviewFormValues,
  reviewSchema,
} from '../../lib/reviewSchema';
import { RatingDisplay } from '../RatingDisplay';

const SUCCESS_MESSAGE_MS = 5000;
const GENERIC_ERROR_MESSAGE = 'Não foi possível publicar a avaliação. Tente novamente.';

/** Teclas que ajustam o range; Tab e as demais não podem escolher a nota. */
const RANGE_ADJUST_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

const FIELDS = ['nome', 'nota', 'comentario'] as const;
type FieldName = (typeof FIELDS)[number];

const DEFAULT_VALUES: ReviewFormValues = { nome: '', nota: null, comentario: '' };

interface ReviewFormProps {
  movieId: string;
  /** Chamado após publicar, para a lista voltar à primeira página. */
  onPublished: () => void;
}

/** Formulário de nova avaliação (nome, nota de 0 a 10 e resenha). */
export function ReviewForm({ movieId, onPublished }: ReviewFormProps) {
  const id = useId();
  const ids = {
    nome: `${id}-nome`,
    nota: `${id}-nota`,
    comentario: `${id}-comentario`,
    counter: `${id}-contador`,
    error: (field: FieldName) => `${id}-${field}-erro`,
  };

  const createReview = useCreateReview(movieId);
  const [published, setPublished] = useState(false);
  const successTimer = useRef<number | undefined>(undefined);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues, unknown, ReviewFormOutput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const comentario = useWatch({ control, name: 'comentario' });

  useEffect(() => () => window.clearTimeout(successTimer.current), []);

  function showPublished() {
    window.clearTimeout(successTimer.current);
    setPublished(true);
    successTimer.current = window.setTimeout(() => setPublished(false), SUCCESS_MESSAGE_MS);
  }

  async function publish(values: ReviewFormOutput) {
    setPublished(false);
    try {
      await createReview.mutateAsync(values);
    } catch (error) {
      applyServerErrors(error, setError, FIELDS, GENERIC_ERROR_MESSAGE);
      return;
    }
    reset(DEFAULT_VALUES);
    showPublished();
    onPublished();
  }

  function describedBy(field: FieldName, ...extra: string[]): string | undefined {
    const parts = [...extra, ...(errors[field] ? [ids.error(field)] : [])];
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  const serverError = errors.root?.server?.message;

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(publish)(event)}
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-4 rounded-lg p-4 ring-1 ring-slate-200 sm:p-5"
    >
      <h3 id={`${id}-titulo`} className="font-semibold text-slate-900">
        Escreva sua avaliação
      </h3>

      <div>
        <label htmlFor={ids.nome} className={labelClass}>
          Nome
        </label>
        <input
          id={ids.nome}
          type="text"
          autoComplete="name"
          maxLength={NOME_MAX_LENGTH}
          aria-invalid={errors.nome ? true : undefined}
          aria-describedby={describedBy('nome')}
          className={textFieldClass(Boolean(errors.nome))}
          {...register('nome')}
        />
        {errors.nome && (
          <p id={ids.error('nome')} className={errorClass}>
            {errors.nome.message}
          </p>
        )}
      </div>

      <Controller
        control={control}
        name="nota"
        render={({ field }) => {
          const chosen = field.value !== null;
          const choose = (target: HTMLInputElement) => {
            if (!chosen) field.onChange(Number(target.value));
          };
          return (
            <div>
              <label htmlFor={ids.nota} className={labelClass}>
                Nota <span className="font-normal text-slate-500">(0 a 10)</span>
              </label>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
                <input
                  ref={field.ref}
                  id={ids.nota}
                  name={field.name}
                  type="range"
                  min={NOTA_MIN}
                  max={NOTA_MAX}
                  step={NOTA_STEP}
                  // Sem nota escolhida, o polegar fica no meio, mas o valor do formulário é `null`.
                  value={field.value ?? (NOTA_MIN + NOTA_MAX) / 2}
                  aria-valuetext={
                    chosen ? `${formatRating(field.value ?? 0)} de 10` : 'Nenhuma nota escolhida'
                  }
                  aria-invalid={errors.nota ? true : undefined}
                  aria-describedby={describedBy('nota')}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  // Clicar no polegar ou usar o teclado sem mudar o valor não dispara `change`.
                  onClick={(event) => choose(event.currentTarget)}
                  onKeyUp={(event) => {
                    if (RANGE_ADJUST_KEYS.has(event.key)) choose(event.currentTarget);
                  }}
                  onBlur={field.onBlur}
                  className={`h-2 min-w-48 flex-1 cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    chosen ? 'accent-amber-500' : 'accent-slate-500'
                  }`}
                />
                <div aria-hidden="true" className="flex min-w-36 items-center gap-1.5">
                  {chosen ? (
                    <>
                      <RatingDisplay size="sm" value={field.value} />
                      <span className="text-sm text-slate-500">de 10</span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500">Escolha uma nota</span>
                  )}
                </div>
              </div>
              {errors.nota && (
                <p id={ids.error('nota')} className={errorClass}>
                  {errors.nota.message}
                </p>
              )}
            </div>
          );
        }}
      />

      <div>
        <label htmlFor={ids.comentario} className={labelClass}>
          Resenha
        </label>
        <textarea
          id={ids.comentario}
          rows={4}
          maxLength={COMENTARIO_MAX_LENGTH}
          aria-invalid={errors.comentario ? true : undefined}
          aria-describedby={describedBy('comentario', ids.counter)}
          className={`${textFieldClass(Boolean(errors.comentario))} resize-y`}
          {...register('comentario')}
        />
        <div className="mt-1 flex items-start justify-between gap-3">
          {errors.comentario ? (
            <p id={ids.error('comentario')} className="text-sm text-red-700">
              {errors.comentario.message}
            </p>
          ) : (
            <span />
          )}
          <p id={ids.counter} className="shrink-0 text-sm text-slate-500 tabular-nums">
            <span className="sr-only">Caracteres usados: </span>
            {comentario.length}/{COMENTARIO_MAX_LENGTH}
          </p>
        </div>
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${primaryButtonClass} w-full sm:w-auto`}
        >
          {isSubmitting ? 'Publicando…' : 'Publicar avaliação'}
        </button>
        <p role="status" aria-live="polite" className="text-sm font-medium text-emerald-700">
          {published ? 'Avaliação publicada!' : ''}
        </p>
      </div>
    </form>
  );
}
