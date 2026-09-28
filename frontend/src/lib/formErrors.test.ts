import type { UseFormSetError } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api/errors';
import { applyServerErrors } from './formErrors';

interface Values {
  titulo: string;
  diretores: string[];
}

const FIELDS = ['titulo', 'diretores'] as const;
const FALLBACK = 'Não foi possível salvar.';

function apply(error: unknown) {
  const setError = vi.fn<UseFormSetError<Values>>();
  applyServerErrors<Values>(error, setError, FIELDS, FALLBACK);
  return setError;
}

describe('applyServerErrors', () => {
  it('associa `diretores.N` ao campo `diretores`, só com o primeiro erro', () => {
    const setError = apply(
      new ApiError(422, 'Dados inválidos.', [
        { field: 'diretores.0', message: 'Nome vazio.' },
        { field: 'diretores.1', message: 'Nome longo demais.' },
      ]),
    );
    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith(
      'diretores',
      { type: 'server', message: 'Nome vazio.' },
      { shouldFocus: true },
    );
  });

  it('dá foco só ao primeiro campo com erro', () => {
    const setError = apply(
      new ApiError(422, 'Dados inválidos.', [
        { field: 'titulo', message: 'Obrigatório.' },
        { field: 'diretores.2', message: 'Nome vazio.' },
      ]),
    );
    expect(setError.mock.calls).toEqual([
      ['titulo', { type: 'server', message: 'Obrigatório.' }, { shouldFocus: true }],
      ['diretores', { type: 'server', message: 'Nome vazio.' }, { shouldFocus: false }],
    ]);
  });

  it('erros sem campo conhecido vão para `root.server`, junto com os de campo', () => {
    const setError = apply(
      new ApiError(422, 'Dados inválidos.', [
        { field: 'titulo', message: 'Obrigatório.' },
        { field: 'body', message: 'JSON inválido.' },
        { field: '', message: 'Tente de novo.' },
      ]),
    );
    expect(setError).toHaveBeenCalledWith('root.server', {
      message: 'JSON inválido. Tente de novo.',
    });
    expect(setError).toHaveBeenCalledWith('titulo', expect.anything(), expect.anything());
  });

  it('erro sem `errors` (404, 5xx) mostra o `detail` na mensagem geral', () => {
    const setError = apply(new ApiError(404, 'Filme não encontrado.'));
    expect(setError.mock.calls).toEqual([['root.server', { message: 'Filme não encontrado.' }]]);
  });

  it('falha de rede mostra a mensagem de conexão', () => {
    const setError = apply(ApiError.network());
    expect(setError).toHaveBeenCalledWith('root.server', {
      message: expect.stringContaining('Não foi possível conectar ao servidor') as string,
    });
  });

  it('erro que não é `ApiError` usa a mensagem de fallback', () => {
    const setError = apply(new Error('boom'));
    expect(setError.mock.calls).toEqual([['root.server', { message: FALLBACK }]]);
  });
});
