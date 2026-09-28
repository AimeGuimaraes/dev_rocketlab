import { useEffect } from 'react';

export const APP_NAME = 'RocketLab Filmes';

/** Define o título da aba enquanto a página está montada e restaura o anterior ao sair. */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (title === null) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
