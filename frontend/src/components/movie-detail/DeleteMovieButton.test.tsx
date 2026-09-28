import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { queryKeys } from '../../api/hooks/queryKeys';
import type { MovieListItem, Page } from '../../api/types';
import { makePage, movieDetail, movies } from '../../test/fixtures';
import { apiUrl, errorResponse } from '../../test/handlers';
import { currentLocation, renderWithProviders } from '../../test/render';
import { server } from '../../test/server';
import { FlashBanner } from '../FlashBanner';
import { DeleteMovieButton } from './DeleteMovieButton';

const MOVIE_URL = apiUrl('/movies/:id');

/** Conta os DELETEs recebidos e responde com `respond`. */
function captureDeletes(respond: () => Response = () => new HttpResponse(null, { status: 204 })) {
  const ids: string[] = [];
  server.use(
    http.delete(MOVIE_URL, ({ params }) => {
      ids.push(String(params.id));
      return respond();
    }),
  );
  return ids;
}

function setup() {
  const utils = renderWithProviders(
    <DeleteMovieButton movieId="m-001" title="O Voo da Coruja" catalogSearch="?q=coruja" />,
    {
      route: '/filmes/m-001',
      path: '/filmes/:id',
      // Destino da navegação: o banner lê a mensagem do state, como no catálogo.
      routes: [{ path: '/', element: <FlashBanner /> }],
    },
  );
  const trigger = screen.getByRole('button', { name: 'Remover' });
  // `hidden`: fechado, o dialog fica fora da árvore acessível.
  const dialog = screen.getByRole('dialog', { hidden: true });
  return { ...utils, trigger, dialog };
}

describe('DeleteMovieButton', () => {
  it('abre o dialog de confirmação com foco em "Cancelar"', async () => {
    const { user, trigger, dialog } = setup();
    expect(dialog).not.toHaveAttribute('open');

    await user.click(trigger);

    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('dialog', { name: 'Remover filme?' })).toBe(dialog);
    expect(dialog).toHaveAccessibleDescription(/O filme O Voo da Coruja será removido/);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('"Cancelar" fecha sem remover e devolve o foco ao botão', async () => {
    const deletes = captureDeletes();
    const { user, trigger, dialog } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(dialog).not.toHaveAttribute('open');
    expect(trigger).toHaveFocus();
    expect(deletes).toHaveLength(0);
    expect(currentLocation()).toBe('/filmes/m-001');
  });

  it('confirmar remove, volta ao catálogo com os filtros e mostra a mensagem', async () => {
    const deletes = captureDeletes();
    const { user, trigger, queryClient } = setup();
    const listKey = queryKeys.movies.list({ page: 1, page_size: 20 });
    queryClient.setQueryData<Page<MovieListItem>>(listKey, makePage(movies));
    queryClient.setQueryData(queryKeys.movies.detail('m-001'), movieDetail);

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Remover filme' }));

    expect(await screen.findByText('Filme removido.')).toBeInTheDocument();
    expect(currentLocation()).toBe('/?q=coruja');
    expect(deletes).toEqual(['m-001']);
    // O filme sai do cache: do detalhe e das listas.
    expect(queryClient.getQueryData(queryKeys.movies.detail('m-001'))).toBeUndefined();
    const list = queryClient.getQueryData<Page<MovieListItem>>(listKey);
    expect(list?.items.some((movie) => movie.sk_movie_id === 'm-001')).toBe(false);
    expect(list?.total).toBe(movies.length - 1);
  });

  it('trata o 404 como sucesso (o filme já não existe)', async () => {
    captureDeletes(() => errorResponse(404, { detail: 'Filme não encontrado.' }));
    const { user, trigger } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Remover filme' }));

    expect(await screen.findByText('Filme removido.')).toBeInTheDocument();
    expect(currentLocation()).toBe('/?q=coruja');
    expect(screen.queryByText('Filme não encontrado.')).not.toBeInTheDocument();
  });

  it('outros erros aparecem no dialog, que continua aberto', async () => {
    captureDeletes(() => errorResponse(500, { detail: 'Erro no servidor.' }));
    const { user, trigger, dialog } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Remover filme' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro no servidor.');
    expect(dialog).toHaveAttribute('open');
    expect(currentLocation()).toBe('/filmes/m-001');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled());

    // Reabrir limpa o erro anterior.
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(trigger);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
