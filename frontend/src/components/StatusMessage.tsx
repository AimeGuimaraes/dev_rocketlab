import type { ReactNode } from 'react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  /** Desabilita o botão enquanto a nova tentativa está em andamento. */
  retrying?: boolean;
}

/** Mensagem de erro de carregamento com o botão "Tentar novamente". */
export function ErrorState({ message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg bg-red-50 p-4 text-red-800 ring-1 ring-red-200"
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60"
      >
        {retrying ? 'Tentando…' : 'Tentar novamente'}
      </button>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  /** `h1` quando o aviso ocupa a página inteira (ex.: "Filme não encontrado"). */
  as?: 'p' | 'h1';
  /** Texto de apoio e/ou ação (ex.: um link). */
  children?: ReactNode;
}

/** Aviso de que não há nada a mostrar. */
export function EmptyState({ title, as: Title = 'p', children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-4 py-12 text-center ring-1 ring-slate-200">
      <Title className="text-lg font-semibold text-slate-900">{title}</Title>
      {children && <div className="text-slate-600">{children}</div>}
    </div>
  );
}
