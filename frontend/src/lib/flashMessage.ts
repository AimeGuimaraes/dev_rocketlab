/** State de navegação com uma mensagem de sucesso para a página de destino exibir. */
export interface FlashState {
  flash: string;
}

/** Valida o `location.state` (que é `unknown`) e devolve a mensagem, se houver. */
export function getFlashMessage(state: unknown): string | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'flash' in state &&
    typeof state.flash === 'string' &&
    state.flash !== ''
  ) {
    return state.flash;
  }
  return null;
}

/** Devolve o state sem a mensagem, preservando o resto (ex.: a busca do catálogo de origem). */
export function withoutFlash(state: unknown): unknown {
  if (typeof state !== 'object' || state === null || !('flash' in state)) return state;
  const rest: Record<string, unknown> = { ...state };
  delete rest.flash;
  return rest;
}
