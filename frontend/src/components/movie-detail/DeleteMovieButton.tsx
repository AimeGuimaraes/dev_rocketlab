import { useId, useRef } from 'react';
import { useNavigate } from 'react-router';

import { useDeleteMovie } from '../../api/hooks';
import type { FlashState } from '../../lib/flashMessage';
import { secondaryButtonClass } from '../../lib/formStyles';

const triggerClass =
  'min-h-11 rounded-md bg-white px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none';
const confirmClass =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-60';

interface DeleteMovieButtonProps {
  movieId: string;
  title: string;
  /** Query string do catálogo de origem, para voltar com os mesmos filtros. */
  catalogSearch: string;
}

/**
 * Botão "Remover" com modal de confirmação (`<dialog>` nativo).
 *
 * A mutação fica aqui, e não na página de detalhe: as mudanças de status dela re-renderizam só
 * este componente. Assim a página não relê o filme já removido do cache (o que mostraria o
 * skeleton e depois "Filme não encontrado") enquanto a navegação ao catálogo não é aplicada.
 */
export function DeleteMovieButton({ movieId, title, catalogSearch }: DeleteMovieButtonProps) {
  const navigate = useNavigate();
  const deleteMovie = useDeleteMovie();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  const removing = deleteMovie.isPending;

  function open() {
    deleteMovie.reset();
    dialogRef.current?.showModal();
    // O `autoFocus` do React não vale para um dialog já montado: o foco inicial é explícito.
    cancelRef.current?.focus();
  }

  function close() {
    if (removing) return;
    dialogRef.current?.close();
  }

  function confirm() {
    if (removing) return;
    deleteMovie.mutate(movieId, {
      onSuccess: () => {
        const state: FlashState = { flash: 'Filme removido.' };
        void navigate({ pathname: '/', search: catalogSearch }, { replace: true, state });
      },
    });
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={open} className={triggerClass}>
        Remover
      </button>

      {/* Clique fora = clique no próprio dialog (o backdrop); o conteúdo ocupa a caixa toda. */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={removing}
        onCancel={(event) => {
          // Esc: não fecha enquanto a remoção está em andamento.
          if (removing) event.preventDefault();
        }}
        onClose={() => triggerRef.current?.focus()}
        onPointerDown={(event) => {
          pressedOnBackdrop.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          // Exige que o clique tenha começado no backdrop: arrastar uma seleção de texto para
          // fora do modal não o fecha.
          if (event.target === event.currentTarget && pressedOnBackdrop.current) close();
          pressedOnBackdrop.current = false;
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 id={titleId} className="text-lg font-semibold">
            Remover filme?
          </h2>
          <p id={descriptionId} className="text-sm text-slate-700">
            O filme <strong className="font-semibold text-slate-900">{title}</strong> será removido
            junto com todas as avaliações dele. Esta ação não pode ser desfeita.
          </p>

          {deleteMovie.error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              {deleteMovie.error.detail}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              onClick={close}
              disabled={removing}
              className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Cancelar
            </button>
            {/* `aria-disabled` em vez de `disabled`: mantém o foco no botão durante a remoção. */}
            <button
              type="button"
              onClick={confirm}
              aria-disabled={removing}
              className={confirmClass}
            >
              {removing ? 'Removendo…' : 'Remover filme'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
