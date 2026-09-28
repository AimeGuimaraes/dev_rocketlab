import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from '../api/errors';

/**
 * Leva os erros de uma chamada à API para o formulário.
 *
 * Cada `errors[].field` do backend vira erro do campo correspondente. Caminhos pontuados
 * (ex.: `diretores.0`) são associados ao primeiro segmento. O primeiro campo com erro recebe
 * o foco. Erros sem campo conhecido, 404, rede e 5xx vão para a mensagem geral (`root.server`).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  fallbackMessage: string,
): void {
  if (!(error instanceof ApiError)) {
    setError('root.server', { message: fallbackMessage });
    return;
  }

  const findField = (raw: string): Path<T> | undefined => {
    const head = raw.split('.')[0];
    return fields.find((field) => field === raw || field === head);
  };

  const general: string[] = [];
  const seen = new Set<Path<T>>();
  for (const item of error.errors ?? []) {
    const field = findField(item.field);
    if (field === undefined) {
      general.push(item.message);
    } else if (!seen.has(field)) {
      // Um campo mostra só o primeiro erro (ex.: vários `diretores.N`).
      setError(field, { type: 'server', message: item.message }, { shouldFocus: seen.size === 0 });
      seen.add(field);
    }
  }

  if (seen.size === 0 || general.length > 0) {
    setError('root.server', {
      message: general.length > 0 ? general.join(' ') : error.detail,
    });
  }
}
