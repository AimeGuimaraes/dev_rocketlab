import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { getFlashMessage, withoutFlash } from '../lib/flashMessage';

const FLASH_MESSAGE_MS = 6000;

/**
 * Mensagem de sucesso enviada no state da navegação (cadastro, edição, remoção).
 *
 * O texto entra na região `aria-live` logo depois da montagem, para o leitor de tela anunciar,
 * e sai do histórico em seguida: recarregar ou voltar à página não repete a mensagem. O resto
 * do state (ex.: a busca do catálogo de origem) é mantido.
 */
export function useFlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  const locationState: unknown = location.state;
  const incoming = getFlashMessage(locationState);
  const { pathname, search, hash } = location;

  useEffect(() => {
    if (incoming === null) return;
    const timer = window.setTimeout(() => {
      setMessage(incoming);
      void navigate(
        { pathname, search, hash },
        { replace: true, state: withoutFlash(locationState) },
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [incoming, locationState, pathname, search, hash, navigate]);

  useEffect(() => {
    if (message === null) return;
    const timer = window.setTimeout(() => setMessage(null), FLASH_MESSAGE_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  return { message, dismiss: () => setMessage(null) };
}
