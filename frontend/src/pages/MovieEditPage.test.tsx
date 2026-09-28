import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { MovieDetail, MovieUpdate } from '../api/types';
import { FlashBanner } from '../components/FlashBanner';
import { movieDetail } from '../test/fixtures';
import { apiUrl, errorResponse } from '../test/handlers';
import { currentLocation, renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { MovieEditPage } from './MovieEditPage';

const MOVIE_URL = apiUrl('/movies/:id');

/** Registra o corpo dos PATCHs e responde com o filme. */
function capturePatches() {
  const bodies: MovieUpdate[] = [];
  server.use(
    http.patch(MOVIE_URL, async ({ request }) => {
      bodies.push((await request.json()) as MovieUpdate);
      return HttpResponse.json<MovieDetail>(movieDetail);
    }),
  );
  return bodies;
}

function setup() {
  return renderWithProviders(<MovieEditPage />, {
    route: '/filmes/m-001/editar',
    path: '/filmes/:id/editar',
    // Destino depois de salvar: o banner lê a mensagem do state, como no detalhe.
    routes: [{ path: '/filmes/:id', element: <FlashBanner /> }],
  });
}

/** Espera o formulário aparecer (depois de carregar o filme e os gêneros). */
async function findForm() {
  const titulo = await screen.findByRole('textbox', { name: /Título/ });
  return {
    titulo,
    sinopse: screen.getByRole('textbox', { name: 'Sinopse' }),
    duracao: screen.getByRole('spinbutton', { name: 'Duração' }),
    salvar: screen.getByRole('button', { name: 'Salvar' }),
  };
}

describe('MovieEditPage', () => {
  it('abre o formulário preenchido com os dados do filme', async () => {
    setup();
    const { titulo, sinopse, duracao } = await findForm();

    expect(screen.getByRole('heading', { name: 'Editar: O Voo da Coruja' })).toBeInTheDocument();
    expect(titulo).toHaveValue('O Voo da Coruja');
    expect(sinopse).toHaveValue('Uma coruja atravessa o país.');
    expect(screen.getByRole('spinbutton', { name: 'Ano de lançamento' })).toHaveValue(2021);
    expect(screen.getByLabelText('Data de lançamento')).toHaveValue('2021-12-16');
    expect(screen.getByRole('textbox', { name: 'URL do pôster' })).toHaveValue(
      'https://example.com/poster.jpg',
    );
    // Duração `0` ("desconhecida") abre vazia.
    expect(duracao).toHaveValue(null);

    // Diretores repetidos no banco aparecem uma vez.
    const directors = screen.getByRole('list', { name: 'Diretores adicionados' });
    expect(
      within(directors)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Fulana de Tal×', 'Beltrano×']);

    // Gêneros vêm por nome no detalhe e são marcados pelo id correspondente.
    const group = screen.getByRole('group', { name: 'Gêneros' });
    expect(within(group).getByRole('checkbox', { name: 'Ação' })).toBeChecked();
    expect(within(group).getByRole('checkbox', { name: 'Ficção científica' })).toBeChecked();
    expect(within(group).getByRole('checkbox', { name: 'Drama' })).not.toBeChecked();
    expect(within(group).getByRole('checkbox', { name: 'Comédia' })).not.toBeChecked();
  });

  it('"Salvar" fica desabilitado enquanto nada muda', async () => {
    const { user } = setup();
    const { titulo, salvar } = await findForm();

    expect(salvar).toBeDisabled();
    expect(salvar).toHaveAccessibleDescription('Nenhuma alteração para salvar.');

    await user.type(titulo, '!');
    expect(salvar).toBeEnabled();

    // Voltar ao valor original desfaz a alteração.
    await user.type(titulo, '{Backspace}');
    expect(salvar).toBeDisabled();

    // Marcar e desmarcar um gênero também não conta como alteração.
    const drama = screen.getByRole('checkbox', { name: 'Drama' });
    await user.click(drama);
    expect(salvar).toBeEnabled();
    await user.click(drama);
    expect(salvar).toBeDisabled();
  });

  it('alterar só a sinopse envia um PATCH só com a sinopse', async () => {
    const bodies = capturePatches();
    const { user } = setup();
    const { sinopse, salvar } = await findForm();

    await user.clear(sinopse);
    await user.type(sinopse, '  Nova sinopse.  ');
    await user.click(salvar);

    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();
    expect(currentLocation()).toBe('/filmes/m-001');
    expect(bodies).toEqual([{ sinopse: 'Nova sinopse.' }]);
  });

  it('esvaziar um opcional envia `null` para limpar o valor', async () => {
    const bodies = capturePatches();
    const { user } = setup();
    const { sinopse, salvar } = await findForm();

    await user.clear(sinopse);
    await user.click(salvar);

    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();
    expect(bodies).toEqual([{ sinopse: null }]);
  });

  it('filme com duração 0 abre com a duração vazia e salva sem enviá-la', async () => {
    const bodies = capturePatches();
    const { user } = setup();
    const { titulo, duracao, salvar } = await findForm();
    expect(duracao).toHaveValue(null);

    await user.clear(titulo);
    await user.type(titulo, 'O Voo da Coruja (versão estendida)');
    await user.click(salvar);

    expect(await screen.findByText('Alterações salvas.')).toBeInTheDocument();
    expect(bodies).toEqual([{ titulo: 'O Voo da Coruja (versão estendida)' }]);
  });

  it('mostra "Filme não encontrado" para um 404', async () => {
    server.use(http.get(MOVIE_URL, () => errorResponse(404, { detail: 'Filme não encontrado.' })));
    setup();

    expect(await screen.findByText('Filme não encontrado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });

  it('mostra outros erros de carregamento com a opção de tentar novamente', async () => {
    server.use(http.get(MOVIE_URL, () => errorResponse(500, { detail: 'Erro no servidor.' })));
    setup();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Erro no servidor.');
    expect(within(alert).getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
