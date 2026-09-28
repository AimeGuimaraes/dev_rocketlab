import { useFlashMessage } from '../hooks/useFlashMessage';

/** Banner de sucesso para a mensagem recebida no state da navegação; some sozinho. */
export function FlashBanner() {
  const { message, dismiss } = useFlashMessage();

  return (
    // Fica sempre no DOM para o anúncio funcionar quando o texto entra.
    <div role="status" aria-live="polite">
      {message && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          <p>{message}</p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar mensagem"
            className="touch-target relative -my-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </div>
  );
}
