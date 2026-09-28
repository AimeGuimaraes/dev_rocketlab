import createClient from 'openapi-fetch';

import { env } from '../lib/env';
import { ApiError } from './errors';
import type { paths } from './schema';

/**
 * Paths do schema sem o prefixo `/api/v1`, que já faz parte de `env.apiUrl`.
 * Ex.: `/api/v1/movies` vira `/movies`; rotas fora do prefixo (como `/health`) ficam de fora.
 */
type ApiPaths = {
  [K in keyof paths as K extends `/api/v1${infer Rest}` ? Rest : never]: paths[K];
};

/** Cliente HTTP tipado pelos paths do OpenAPI do backend. */
export const api = createClient<ApiPaths>({ baseUrl: env.apiUrl });

/** Formato mínimo do retorno do openapi-fetch usado pelos helpers abaixo. */
interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/** Aguarda a requisição e padroniza erros de rede e de HTTP como `ApiError`. */
async function send<T>(request: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  let result: ApiResult<T>;
  try {
    result = await request;
  } catch (error) {
    // Cancelamento (ex.: TanStack Query abortando uma query) não é erro de rede.
    if (isAbortError(error)) throw error;
    // O fetch lança TypeError quando não há resposta do servidor.
    if (error instanceof TypeError) throw ApiError.network();
    throw error;
  }
  if (!result.response.ok) {
    throw ApiError.fromResponse(result.response.status, result.error);
  }
  return result;
}

/** Devolve o corpo da resposta ou lança `ApiError`. */
export async function unwrap<T>(request: Promise<ApiResult<T>>): Promise<T> {
  const { data, response } = await send(request);
  if (data === undefined) {
    throw new ApiError(response.status, 'Resposta vazia inesperada do servidor.');
  }
  return data;
}

/** Para respostas sem corpo (ex.: `204`): só garante sucesso ou lança `ApiError`. */
export async function ensureOk(request: Promise<ApiResult<unknown>>): Promise<void> {
  await send(request);
}
