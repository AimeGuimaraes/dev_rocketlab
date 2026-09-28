import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '../api/errors';

const MAX_QUERY_RETRIES = 1;

/** Repete só falhas que podem ser passageiras (rede e 5xx); 4xx não melhora com retry. */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_QUERY_RETRIES;
}

/** Cliente único do TanStack Query compartilhado pela aplicação. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados do catálogo mudam pouco: 30 s evita refetch a cada navegação.
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
