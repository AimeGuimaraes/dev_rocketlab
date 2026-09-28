import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import type { MovieCreate, MovieDetail } from '../api/types';
import { FlashBanner } from '../components/FlashBanner';
import { makeMovieDetail } from '../test/fixtures';
import { apiUrl, errorResponse } from '../test/handlers';
import { currentLocation, renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { MovieCreatePage } from './MovieCreatePage';

const MOVIES_URL = apiUrl('/movies');

/** Registra o corpo dos POSTs de filme e responde 201 com o filme criado. */
function capturePosts() {
  const bodies: MovieCreate[] = [];
  server.use(
    http.post(MOVIES_URL, async ({ request }) => {
      bodies.push((await request.json()) as MovieCreate);
      return HttpResponse.json<MovieDetail>(makeMovieDetail({ sk_movie_id: 'm-new' }), {
        status: 201,
      });
    }),
  );
  return bodies;
}

function setup() {
  const utils = renderWithProviders(<MovieCreatePage />, {
    route: '/filmes/novo',
    path: '/filmes/novo',
    // Destino depois de salvar: o banner lê a mensagem do state, como no detalhe.
    routes: [{ path: '/filmes/:id', element: <FlashBanner /> }],
  });
  return {
    ...utils,
    titulo: screen.getByRole('textbox', { name: /Título/ }),
    diretor: screen.getByRole('textbox', { name: 'Nome do diretor' }),
    adicionar: screen.getByRole('button', { name: 'Adicionar' }),
    salvar: screen.getByRole('button', { name: 'Salvar' }),
  };
}

function directorNames(): string[] {
  const list = screen.queryByRole('list', { name: 'Diretores adicionados' });
  if (!list) return [];
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent?.replace('×', '') ?? '');
}

describe('MovieCreatePage / MovieForm', () => {
  it('envio vazio mostra o erro no título, sem chamar a API', async () => {
    const bodies = capturePosts();
    const { user, titulo, salvar } = setup();

    await user.click(salvar);

    expect(await screen.findByText('Informe o título.')).toBeInTheDocument();
    expect(titulo).toHaveAttribute('aria-invalid', 'true');
    expect(titulo).toHaveAccessibleDescription('Informe o título.');
    expect(titulo).toHaveFocus();
    expect(bodies).toHaveLength(0);
  });

  it('adiciona e remove diretores e rejeita nomes repetidos ou vazios', async () => {
    const bodies = capturePosts();
    const { user, diretor, adicionar } = setup();
    expect(screen.getByText('Nenhum diretor adicionado.')).toBeInTheDocument();

    await user.click(adicionar);
    expect(screen.getByText('Digite o nome do diretor antes de adicionar.')).toBeInTheDocument();

    await user.type(diretor, '  Fulana de Tal ');
    await user.click(adicionar);
    // Enter adiciona o nome e não envia o formulário.
    await user.type(diretor, 'Beltrano{Enter}');
    expect(directorNames()).toEqual(['Fulana de Tal', 'Beltrano']);
    expect(diretor).toHaveValue('');
    expect(diretor).toHaveFocus();
    expect(bodies).toHaveLength(0);

    // Repetido sem diferenciar maiúsculas e espaços.
    await user.type(diretor, ' fulana de tal{Enter}');
    expect(screen.getByText('fulana de tal já está na lista.')).toBeInTheDocument();
    expect(diretor).toHaveAttribute('aria-invalid', 'true');
    expect(diretor).toHaveValue(' fulana de tal');
    expect(directorNames()).toEqual(['Fulana de Tal', 'Beltrano']);

    // Digitar de novo tira o aviso.
    await user.clear(diretor);
    expect(screen.queryByText('fulana de tal já está na lista.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remover Fulana de Tal' }));
    expect(directorNames()).toEqual(['Beltrano']);
    expect(screen.getByText('Fulana de Tal removido.')).toBeInTheDocument();
  });

  it('marca e desmarca gêneros (traduzidos, em ordem alfabética)', async () => {
    const { user } = setup();
    const group = screen.getByRole('group', { name: 'Gêneros' });
    const acao = await within(group).findByRole('checkbox', { name: 'Ação' });

    expect(
      within(group)
        .getAllByRole('checkbox')
        .map((box) => box.parentElement?.textContent),
    ).toEqual(['Ação', 'Comédia', 'Drama', 'Ficção científica']);

    const drama = within(group).getByRole('checkbox', { name: 'Drama' });
    await user.click(drama);
    await user.click(acao);
    expect(drama).toBeChecked();
    expect(acao).toBeChecked();

    await user.click(drama);
    expect(drama).not.toBeChecked();
  });

  it('cadastra, navega para o detalhe e mostra a mensagem de sucesso', async () => {
    const bodies = capturePosts();
    const { user, titulo, diretor, salvar } = setup();

    await user.type(titulo, '  Novo Filme  ');
    await user.type(screen.getByRole('spinbutton', { name: 'Ano de lançamento' }), '2024');
    await user.type(screen.getByRole('spinbutton', { name: 'Duração' }), '95');
    await user.type(diretor, 'Fulana{Enter}');
    // Marcados fora de ordem: a lista sai na ordem das opções.
    await user.click(await screen.findByRole('checkbox', { name: 'Drama' }));
    await user.click(screen.getByRole('checkbox', { name: 'Ação' }));
    await user.click(salvar);

    expect(await screen.findByText('Filme cadastrado com sucesso.')).toBeInTheDocument();
    expect(currentLocation()).toBe('/filmes/m-new');
    // Opcionais vazios não são enviados.
    expect(bodies).toEqual([
      {
        titulo: 'Novo Filme',
        diretores: ['Fulana'],
        ano_lancamento: 2024,
        genre_ids: ['g-action', 'g-drama'],
        duracao_minutos: 95,
      },
    ]);
  });

  it('valida os campos opcionais antes de enviar', async () => {
    const bodies = capturePosts();
    const { user, titulo, salvar } = setup();

    await user.type(titulo, 'Novo Filme');
    await user.type(screen.getByRole('spinbutton', { name: 'Ano de lançamento' }), '1700');
    await user.type(screen.getByRole('textbox', { name: 'URL do pôster' }), 'ftp://x');
    await user.click(salvar);

    expect(await screen.findByText('Informe um ano entre 1800 e 2100.')).toBeInTheDocument();
    expect(
      screen.getByText('Informe uma URL válida começando com http:// ou https://.'),
    ).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('mostra o 422 com `genre_ids` no campo de gêneros', async () => {
    server.use(
      http.post(MOVIES_URL, () =>
        errorResponse(422, {
          detail: 'Dados inválidos.',
          errors: [{ field: 'genre_ids', message: 'Gênero inexistente.' }],
        }),
      ),
    );
    const { user, titulo, salvar } = setup();

    await user.type(titulo, 'Novo Filme');
    await user.click(await screen.findByRole('checkbox', { name: 'Drama' }));
    await user.click(salvar);

    const group = screen.getByRole('group', { name: 'Gêneros' });
    expect(await within(group).findByText('Gênero inexistente.')).toBeInTheDocument();
    expect(group).toHaveAccessibleDescription('Gênero inexistente.');
    // O foco vai para o primeiro checkbox do grupo.
    expect(within(group).getByRole('checkbox', { name: 'Ação' })).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(currentLocation()).toBe('/filmes/novo');
  });

  it('mostra na mensagem geral um erro sem campo', async () => {
    server.use(http.post(MOVIES_URL, () => errorResponse(500, { detail: 'Erro no servidor.' })));
    const { user, titulo, salvar } = setup();

    await user.type(titulo, 'Novo Filme');
    await user.click(salvar);

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro no servidor.');
    expect(salvar).toBeEnabled();
    expect(currentLocation()).toBe('/filmes/novo');
  });

  it('"Cancelar" volta ao catálogo', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/');
  });
});
