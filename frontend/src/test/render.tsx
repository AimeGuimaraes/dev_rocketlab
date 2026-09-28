import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

type UserEventOptions = Parameters<typeof userEvent.setup>[0];

interface ExtraRoute {
  path: string;
  element: ReactNode;
}

interface RenderOptions {
  /** URL inicial do `MemoryRouter` (ex.: `/?page=2`). */
  route?: string;
  /** Padrão de rota em que `ui` é montado (ex.: `filmes/:id`). */
  path?: string;
  /** Rotas adicionais, ex.: o destino de uma navegação. */
  routes?: ExtraRoute[];
  userOptions?: UserEventOptions;
}

/** Mostra a URL atual para os testes verificarem a navegação. */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

/** Cliente do TanStack Query isolado por teste, sem retry. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/** Renderiza com QueryClient novo e `MemoryRouter`; devolve também o `user` do user-event. */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path = '*', routes = [], userOptions }: RenderOptions = {},
) {
  const queryClient = createTestQueryClient();
  const user = userEvent.setup(userOptions);
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          {routes.map((extra) => (
            <Route key={extra.path} path={extra.path} element={extra.element} />
          ))}
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, user, queryClient };
}

/** URL atual (`pathname + search`) exibida pelo `LocationDisplay`. */
export function currentLocation(): string {
  return screen.getByTestId('location').textContent ?? '';
}
