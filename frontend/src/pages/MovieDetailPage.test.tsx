import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { MovieDetail } from '../api/types';
import { makeMovieDetail, moviePerformance } from '../test/fixtures';
import { apiUrl, errorResponse } from '../test/handlers';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { MovieDetailPage } from './MovieDetailPage';

const MOVIE_URL = apiUrl('/movies/:id');

const elenco = Array.from({ length: 12 }, (_, index) => `Ator ${index + 1}`);

const fullDetail = makeMovieDetail({
  duracao_minutos: 127,
  diretores: ['Fulana de Tal', 'Beltrano'],
  roteiristas: ['Sicrana'],
  produtoras: ['Estúdio Fictício', 'Outra Produtora'],
  elenco,
  performance: moviePerformance,
});

function serveDetail(detail: MovieDetail) {
  server.use(http.get(MOVIE_URL, () => HttpResponse.json<MovieDetail>(detail)));
}

function setup() {
  return renderWithProviders(<MovieDetailPage />, {
    route: '/filmes/m-001',
    path: '/filmes/:id',
  });
}

describe('MovieDetailPage', () => {
  it('renderiza título, ficha, data de lançamento e gêneros', async () => {
    serveDetail(fullDetail);
    setup();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'O Voo da Coruja' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('O Voo da Coruja · RocketLab Filmes');
    expect(screen.getByText('2021 · 2h 7min · Lançado')).toBeInTheDocument();

    // "2021-12-16" é o dia 16 também no fuso do Brasil (os testes rodam em UTC-3).
    const release = screen.getByText('16 de dezembro de 2021');
    expect(release.tagName).toBe('TIME');
    expect(release).toHaveAttribute('dateTime', '2021-12-16');

    const genreList = screen.getByRole('list', { name: 'Gêneros' });
    expect(
      within(genreList)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Ficção científica', 'Ação']);
    expect(screen.getByRole('img', { name: 'Nota 8,4 de 10, 3 avaliações' })).toBeInTheDocument();
    expect(screen.getByText('Uma coruja atravessa o país.')).toBeInTheDocument();
  });

  it('mostra a equipe e expande o elenco completo', async () => {
    serveDetail(fullDetail);
    const { user } = setup();

    const crew = await screen.findByRole('region', { name: 'Equipe' });
    expect(within(crew).getByText('Diretores').nextElementSibling).toHaveTextContent(
      'Fulana de Tal, Beltrano',
    );
    expect(within(crew).getByText('Roteiro').nextElementSibling).toHaveTextContent('Sicrana');
    expect(within(crew).getByText('Produtoras').nextElementSibling).toHaveTextContent(
      'Estúdio Fictício, Outra Produtora',
    );

    expect(within(crew).getAllByRole('listitem')).toHaveLength(10);
    const toggle = within(crew).getByRole('button', { name: 'Ver elenco completo (12)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(within(crew).getAllByRole('listitem')).toHaveLength(12);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('Mostrar menos');
  });

  it('usa "Direção" no singular com um diretor só', async () => {
    serveDetail(makeMovieDetail({ diretores: ['Fulana de Tal'] }));
    setup();

    const crew = await screen.findByRole('region', { name: 'Equipe' });
    expect(within(crew).getByText('Direção').nextElementSibling).toHaveTextContent('Fulana de Tal');
  });

  it('mostra os dados financeiros e as notas externas', async () => {
    serveDetail(fullDetail);
    setup();

    const section = await screen.findByRole('region', {
      name: 'Dados financeiros e notas externas',
    });
    const table = within(section).getByRole('table', {
      name: 'Valores financeiros em dólar e em real',
    });
    /** Células USD e BRL da linha, com o espaço não separável do Intl normalizado. */
    const cells = (label: string) =>
      within(within(table).getByRole('row', { name: new RegExp(label) }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent?.replace(/\s/g, ' '));

    expect(cells('Orçamento')).toEqual(['US$ 1.500.000', 'R$ 7.500.000']);
    // Valor ausente aparece como travessão.
    expect(cells('Receita')).toEqual(['US$ 1.200.000', '—']);
    expect(cells('Lucro')).toEqual(['-US$ 300.000', '-R$ 1.500.000']);
    // Prejuízo em destaque.
    const lucroUsd = within(within(table).getByRole('row', { name: /Lucro/ })).getAllByRole(
      'cell',
    )[0];
    expect(lucroUsd).toHaveClass('text-red-700');

    expect(within(section).getByText('Popularidade').nextElementSibling).toHaveTextContent('123,5');
    expect(within(section).getByText('Nota TMDB').nextElementSibling).toHaveTextContent(
      '7,8 · 12.345 votos',
    );
    expect(within(section).getByText('Nota IMDb').nextElementSibling).toHaveTextContent('—');
  });

  it('sem performance, esconde o bloco financeiro', async () => {
    serveDetail(makeMovieDetail({ performance: null }));
    setup();

    await screen.findByRole('heading', { level: 1, name: 'O Voo da Coruja' });
    expect(
      screen.queryByRole('region', { name: 'Dados financeiros e notas externas' }),
    ).not.toBeInTheDocument();
  });

  it('lista as avaliações do filme', async () => {
    setup();

    const reviews = await screen.findByRole('region', { name: 'Avaliações' });
    expect(await within(reviews).findByRole('heading', { name: 'Ana' })).toBeInTheDocument();
    expect(within(reviews).getByText('Roteiro excelente.')).toBeInTheDocument();
    expect(within(reviews).getByText('27/09/2026, 12:30')).toBeInTheDocument();
  });

  it('mostra "Filme não encontrado" para um 404', async () => {
    server.use(http.get(MOVIE_URL, () => errorResponse(404, { detail: 'Filme não encontrado.' })));
    setup();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Filme não encontrado' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' })).toHaveAttribute('href', '/');
    expect(document.title).toBe('Filme não encontrado · RocketLab Filmes');
  });
});
