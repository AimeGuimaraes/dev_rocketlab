import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import type { ReviewCreate, ReviewCreated } from '../../api/types';
import { makeReviewCreated } from '../../test/fixtures';
import { apiUrl, errorResponse } from '../../test/handlers';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';
import { ReviewForm } from './ReviewForm';

const REVIEWS_URL = apiUrl('/movies/:id/reviews');

function setup() {
  const onPublished = vi.fn<() => void>();
  const utils = renderWithProviders(<ReviewForm movieId="m-001" onPublished={onPublished} />);
  return {
    ...utils,
    onPublished,
    nome: screen.getByRole('textbox', { name: 'Nome' }),
    nota: screen.getByRole('slider', { name: /Nota/ }),
    comentario: screen.getByRole('textbox', { name: 'Resenha' }),
    submit: screen.getByRole('button', { name: 'Publicar avaliação' }),
  };
}

/** Registra o corpo dos POSTs de avaliação e responde 201. */
function captureReviewPosts() {
  const bodies: ReviewCreate[] = [];
  server.use(
    http.post(REVIEWS_URL, async ({ request }) => {
      bodies.push((await request.json()) as ReviewCreate);
      return HttpResponse.json<ReviewCreated>(makeReviewCreated(), { status: 201 });
    }),
  );
  return bodies;
}

/** Escolhe uma nota no range (o jsdom não move o polegar pelas setas). */
function chooseNota(slider: HTMLElement, value: string) {
  fireEvent.change(slider, { target: { value } });
}

describe('ReviewForm', () => {
  it('valida os campos obrigatórios com mensagens em pt-BR, sem chamar a API', async () => {
    const bodies = captureReviewPosts();
    const { user, submit, nome, nota, comentario } = setup();

    await user.click(submit);

    expect(await screen.findByText('Informe seu nome.')).toBeInTheDocument();
    expect(screen.getByText('Escolha uma nota de 0 a 10.')).toBeInTheDocument();
    expect(screen.getByText('Escreva sua resenha.')).toBeInTheDocument();
    for (const field of [nome, nota, comentario]) {
      expect(field).toHaveAttribute('aria-invalid', 'true');
    }
    expect(nome).toHaveAccessibleDescription('Informe seu nome.');
    expect(nome).toHaveFocus();
    expect(bodies).toHaveLength(0);
  });

  it('não aceita nome ou resenha só com espaços', async () => {
    const { user, submit, nome, nota, comentario } = setup();
    await user.type(nome, '   ');
    chooseNota(nota, '7');
    await user.type(comentario, '   ');
    await user.click(submit);

    expect(await screen.findByText('Informe seu nome.')).toBeInTheDocument();
    expect(screen.getByText('Escreva sua resenha.')).toBeInTheDocument();
    expect(screen.queryByText('Escolha uma nota de 0 a 10.')).not.toBeInTheDocument();
  });

  it('a nota é obrigatória: passar pelo range com Tab não escolhe nota', async () => {
    const bodies = captureReviewPosts();
    const { user, submit, nome, nota, comentario } = setup();

    await user.type(nome, 'Ana');
    await user.tab();
    expect(nota).toHaveFocus();
    await user.tab();
    expect(comentario).toHaveFocus();
    expect(nota).toHaveAttribute('aria-valuetext', 'Nenhuma nota escolhida');

    await user.type(comentario, 'Muito bom.');
    await user.click(submit);

    expect(await screen.findByText('Escolha uma nota de 0 a 10.')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('clicar no range escolhe a nota em que o polegar está', async () => {
    const { user, nota } = setup();
    await user.click(nota);
    expect(nota).toHaveAttribute('aria-valuetext', '5,0 de 10');
  });

  it('envia a avaliação, limpa o formulário e avisa o sucesso', async () => {
    const bodies = captureReviewPosts();
    const { user, submit, nome, nota, comentario, onPublished } = setup();

    await user.type(nome, '  Ana  ');
    chooseNota(nota, '8.5');
    expect(nota).toHaveAttribute('aria-valuetext', '8,5 de 10');
    await user.type(comentario, 'Roteiro excelente.');
    await user.click(submit);

    expect(await screen.findByText('Avaliação publicada!')).toBeInTheDocument();
    expect(bodies).toEqual([{ nome: 'Ana', nota: 8.5, comentario: 'Roteiro excelente.' }]);
    expect(onPublished).toHaveBeenCalledTimes(1);
    expect(nome).toHaveValue('');
    expect(comentario).toHaveValue('');
    expect(nota).toHaveAttribute('aria-valuetext', 'Nenhuma nota escolhida');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('mostra o erro 422 do backend no campo correspondente', async () => {
    server.use(
      http.post(REVIEWS_URL, () =>
        errorResponse(422, {
          detail: 'Dados inválidos.',
          errors: [{ field: 'comentario', message: 'A resenha contém termos proibidos.' }],
        }),
      ),
    );
    const { user, submit, nome, nota, comentario, onPublished } = setup();

    await user.type(nome, 'Ana');
    chooseNota(nota, '3');
    await user.type(comentario, 'Texto.');
    await user.click(submit);

    expect(await screen.findByText('A resenha contém termos proibidos.')).toBeInTheDocument();
    expect(comentario).toHaveAttribute('aria-invalid', 'true');
    expect(comentario).toHaveFocus();
    expect(nome).not.toHaveAttribute('aria-invalid');
    // Com erro de campo, não há mensagem geral; e o que foi digitado é mantido.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(comentario).toHaveValue('Texto.');
    expect(onPublished).not.toHaveBeenCalled();
  });

  it('mostra a falha de rede na mensagem geral', async () => {
    server.use(http.post(REVIEWS_URL, () => HttpResponse.error()));
    const { user, submit, nome, nota, comentario, onPublished } = setup();

    await user.type(nome, 'Ana');
    chooseNota(nota, '10');
    await user.type(comentario, 'Perfeito.');
    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    );
    expect(onPublished).not.toHaveBeenCalled();
    expect(screen.queryByText('Avaliação publicada!')).not.toBeInTheDocument();
    await waitFor(() => expect(submit).toBeEnabled());
  });
});
