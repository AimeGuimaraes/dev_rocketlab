import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { MovieListItem, Page } from '../api/types';
import { makePage } from '../test/fixtures';
import { apiUrl, errorResponse } from '../test/handlers';
import { currentLocation, renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { CatalogPage } from './CatalogPage';

function cardTitles(): string[] {
  return screen
    .getAllByRole('article')
    .map((card) => within(card).getByRole('heading').textContent ?? '');
}

describe('CatalogPage', () => {
  it('renderiza os cards da primeira página', async () => {
    renderWithProviders(<CatalogPage />);

    expect(await screen.findByRole('heading', { name: 'O Voo da Coruja' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(20);

    const card = screen.getByRole('link', { name: /O Voo da Coruja/ });
    expect(card).toHaveAttribute('href', '/filmes/m-001');
    expect(within(card).getByText('Ação')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Nota 8,4 de 10, 3 avaliações' })).toBeVisible();
    expect(
      within(screen.getByRole('link', { name: /Noite de Tempestade/ })).getByText('Sem avaliações'),
    ).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2 · 25 filmes')).toBeInTheDocument();
    expect(document.title).toBe('Catálogo · RocketLab Filmes');
  });

  it('o link do card tem só o título como nome; ano, gêneros e nota vão na descrição', async () => {
    renderWithProviders(<CatalogPage />);

    const card = await screen.findByRole('link', { name: 'O Voo da Coruja' });
    expect(card).toHaveAccessibleName('O Voo da Coruja');
    expect(card).toHaveAccessibleDescription(/2021/);
    expect(card).toHaveAccessibleDescription(/Ação/);
    // O dom-accessibility-api ignora `aria-label` ao calcular descrições (os navegadores não):
    // confere que a descrição referencia o elemento da nota.
    const describedBy = (card.getAttribute('aria-describedby') ?? '').split(' ');
    const rating = within(card).getByRole('img', { name: 'Nota 8,4 de 10, 3 avaliações' });
    expect(describedBy).toContain(rating.id);
  });

  it('a paginação muda ?page e mostra a página seguinte', async () => {
    const { user } = renderWithProviders(<CatalogPage />);
    await screen.findByRole('heading', { name: 'O Voo da Coruja' });

    await user.click(screen.getByRole('button', { name: 'Ir para a página 2' }));

    expect(currentLocation()).toBe('/?page=2');
    await waitFor(() =>
      expect(cardTitles()).toEqual([
        'Filme Fictício 021',
        'Filme Fictício 022',
        'Filme Fictício 023',
        'Filme Fictício 024',
        'Filme Fictício 025',
      ]),
    );
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('corrige uma página inválida na URL', async () => {
    renderWithProviders(<CatalogPage />, { route: '/?page=abc' });
    await waitFor(() => expect(currentLocation()).toBe('/?page=1'));
  });

  it('a busca filtra o catálogo e volta para a página 1', async () => {
    const { user } = renderWithProviders(<CatalogPage />, { route: '/?page=2' });
    await screen.findByRole('heading', { name: 'Filme Fictício 021' });

    await user.type(screen.getByRole('searchbox', { name: 'Buscar por título' }), 'coruja');

    // Debounce (300 ms) + requisição + render: sob cobertura, pode passar do 1 s padrão.
    expect(
      await screen.findByText('1 filme encontrado para "coruja"', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(currentLocation()).toBe('/?q=coruja');
    await waitFor(() => expect(cardTitles()).toEqual(['O Voo da Coruja']));
    expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument();
  });

  it('mostra o estado vazio quando a busca não encontra nada', async () => {
    const { user } = renderWithProviders(<CatalogPage />, { route: '/?q=inexistente' });

    const title = await screen.findByText('Nenhum filme encontrado');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    // Há também o "Limpar filtros" da barra de filtros; aqui é o do estado vazio.
    const emptyState = title.parentElement ?? document.body;
    await user.click(within(emptyState).getByRole('button', { name: 'Limpar filtros' }));
    expect(currentLocation()).toBe('/');
    expect(await screen.findByRole('heading', { name: 'O Voo da Coruja' })).toBeInTheDocument();
  });

  it('mostra o estado vazio do catálogo sem filmes', async () => {
    server.use(
      http.get(apiUrl('/movies'), () => HttpResponse.json<Page<MovieListItem>>(makePage([]))),
    );
    renderWithProviders(<CatalogPage />);

    expect(await screen.findByText('Nenhum filme cadastrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar o primeiro filme' })).toHaveAttribute(
      'href',
      '/filmes/novo',
    );
  });

  it('mostra o erro da API com a opção de tentar novamente', async () => {
    server.use(http.get(apiUrl('/movies'), () => errorResponse(500, { detail: 'Erro interno.' })));
    renderWithProviders(<CatalogPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Erro interno.');
    expect(within(alert).getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
