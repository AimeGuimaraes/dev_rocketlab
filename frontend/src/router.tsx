import { createBrowserRouter } from 'react-router';

import { Layout } from './components/Layout';
import { CatalogPage } from './pages/CatalogPage';
import { MovieCreatePage } from './pages/MovieCreatePage';
import { MovieDetailPage } from './pages/MovieDetailPage';
import { MovieEditPage } from './pages/MovieEditPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: CatalogPage },
      { path: 'filmes/novo', Component: MovieCreatePage },
      { path: 'filmes/:id', Component: MovieDetailPage },
      { path: 'filmes/:id/editar', Component: MovieEditPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
