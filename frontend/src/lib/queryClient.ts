import { QueryClient } from '@tanstack/react-query';

/** Cliente único do TanStack Query compartilhado pela aplicação. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados do catálogo mudam pouco: 30 s evita refetch a cada navegação.
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
