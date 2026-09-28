import { useEffect, useRef, useState } from 'react';

interface UseDebouncedDraftOptions {
  /** Valor aplicado (o que está na URL). */
  value: string;
  /** Aplica um novo valor; recebe sempre o resultado de `normalize`. */
  onCommit: (value: string) => void;
  delay: number;
  /** Converte o rascunho no valor a aplicar, ou `null` quando ainda não é válido. */
  normalize: (draft: string) => string | null;
}

/** Controle exposto por campos com rascunho, para quem precisa zerá-los por fora. */
export interface DraftFieldHandle {
  /** Cancela o debounce pendente e esvazia o rascunho, sem aplicar nada. */
  reset: () => void;
}

/**
 * Rascunho local de um campo de texto ligado à URL: aplica com debounce enquanto o usuário
 * digita e acompanha mudanças externas do valor (voltar do navegador, "limpar filtros").
 */
export function useDebouncedDraft({ value, onCommit, delay, normalize }: UseDebouncedDraftOptions) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const timerRef = useRef<number | undefined>(undefined);

  // Ajuste durante o render (sem effect): se o valor mudou por fora, o campo passa a mostrá-lo.
  // Quando a mudança veio deste próprio campo, o rascunho já equivale ao valor e é mantido,
  // para não apagar, por exemplo, o espaço que o usuário acabou de digitar.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (normalize(draft) !== value) setDraft(value);
  }

  const pending = normalize(draft);

  useEffect(() => {
    if (pending === null || pending === value) return;
    const timer = window.setTimeout(() => {
      timerRef.current = undefined;
      onCommit(pending);
    }, delay);
    timerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (timerRef.current === timer) timerRef.current = undefined;
    };
  }, [pending, value, onCommit, delay]);

  /** Descarta o debounce pendente, se houver. */
  function cancel() {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }

  /** Cancela o debounce e troca o rascunho, sem aplicar nada. */
  function reset(next = '') {
    cancel();
    setDraft(next);
  }

  /** Aplica o rascunho na hora, sem esperar o debounce. */
  function flush() {
    cancel();
    if (pending !== null && pending !== value) onCommit(pending);
  }

  return { draft, setDraft, flush, cancel, reset, isValid: pending !== null };
}
