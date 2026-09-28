import { createBrowserRouter } from 'react-router';

import { Layout } from './components/Layout';
import { RouteFallback } from './components/RouteFallback';

// Cada página vira um chunk próprio, baixado na primeira visita à rota. Nas navegações, a página
// atual continua na tela até o chunk chegar; na primeira carga aparece o `HydrateFallback`.
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    HydrateFallback: RouteFallback,
    children: [
      {
        index: true,
        lazy: () => import('./pages/CatalogPage').then((m) => ({ Component: m.CatalogPage })),
      },
      {
        path: 'filmes/novo',
        lazy: () =>
          import('./pages/MovieCreatePage').then((m) => ({ Component: m.MovieCreatePage })),
      },
      {
        path: 'filmes/:id',
        lazy: () =>
          import('./pages/MovieDetailPage').then((m) => ({ Component: m.MovieDetailPage })),
      },
      {
        path: 'filmes/:id/editar',
        lazy: () => import('./pages/MovieEditPage').then((m) => ({ Component: m.MovieEditPage })),
      },
      {
        path: '*',
        lazy: () => import('./pages/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })),
      },
    ],
  },
]);
