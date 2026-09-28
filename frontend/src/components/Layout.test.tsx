import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Layout } from './Layout';

/** Página sem `h1` que já define o título da aba. */
function TitleOnlyPage() {
  useDocumentTitle('Carregando filme · RocketLab Filmes');
  return <p>Carregando…</p>;
}

function setup(initialPath = '/') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        Component: Layout,
        children: [
          {
            index: true,
            element: (
              <>
                <h1>Catálogo de filmes</h1>
                <Link to="/?page=2">Página 2</Link>
              </>
            ),
          },
          { path: 'filmes/novo', element: <h1>Novo filme</h1> },
          { path: 'sem-titulo', element: <p>Carregando…</p> },
          { path: 'com-titulo-da-aba', Component: TitleOnlyPage },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
  const user = userEvent.setup();
  render(<RouterProvider router={router} />);
  return { user, router };
}

describe('Layout', () => {
  it('tem os landmarks e marca o link ativo do menu com aria-current', () => {
    setup();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'conteudo');
    expect(screen.getByRole('link', { name: 'Catálogo' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Novo filme' })).not.toHaveAttribute('aria-current');
  });

  it('"Pular para o conteúdo" é o primeiro item do Tab e leva o foco ao main', async () => {
    const { user } = setup();

    await user.tab();
    const skip = screen.getByRole('link', { name: 'Pular para o conteúdo' });
    expect(skip).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('ao trocar de rota, foca o h1 da nova página sem anunciar pela região aria-live', async () => {
    const { user } = setup();
    // No carregamento inicial o foco não é movido.
    expect(document.body).toHaveFocus();

    await user.click(screen.getByRole('link', { name: 'Novo filme' }));

    const heading = await screen.findByRole('heading', { level: 1, name: 'Novo filme' });
    await waitFor(() => expect(heading).toHaveFocus());
    // O leitor de tela já lê o h1 focado; anunciar também duplicaria a leitura.
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('link', { name: 'Novo filme' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('sem h1 na nova página, foca o main e anuncia a troca', async () => {
    const { router } = setup();

    await router.navigate('/sem-titulo');

    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('Página carregada');
  });

  it('sem h1, anuncia o título da aba quando a nova página já o definiu', async () => {
    const { router } = setup();

    await router.navigate('/com-titulo-da-aba');

    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('Carregando filme · RocketLab Filmes');
  });

  it('limpa o anúncio anterior quando a página seguinte tem h1', async () => {
    const { router } = setup();

    await router.navigate('/sem-titulo');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Página carregada'));

    await router.navigate('/filmes/novo');

    const heading = await screen.findByRole('heading', { level: 1, name: 'Novo filme' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('mudar só a query string não move o foco', async () => {
    const { user, router } = setup();
    const link = screen.getByRole('link', { name: 'Página 2' });

    await user.click(link);

    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    expect(link).toHaveFocus();
  });
});
