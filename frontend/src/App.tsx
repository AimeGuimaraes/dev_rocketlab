import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { RouterProvider } from 'react-router';

import { queryClient } from './lib/queryClient';
import { router } from './router';

// Só em desenvolvimento: no build de produção `DEV` é `false` e o chunk nem é gerado.
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((module) => ({
        default: module.ReactQueryDevtools,
      })),
    )
  : null;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
