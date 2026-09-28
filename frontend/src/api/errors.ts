import type { ErrorItem, ErrorResponse } from './types';

const NETWORK_ERROR_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';

function isErrorResponse(body: unknown): body is ErrorResponse {
  return (
    typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string'
  );
}

function fallbackMessage(status: number): string {
  if (status >= 500) return 'Erro no servidor. Tente novamente em instantes.';
  return `A requisição falhou (HTTP ${status}).`;
}

/**
 * Erro de uma chamada à API, montado a partir do `ErrorResponse` do backend.
 *
 * `status` é o código HTTP; `0` indica falha de rede (o servidor não respondeu).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly errors: ErrorItem[] | null;

  constructor(status: number, detail: string, errors: ErrorItem[] | null = null) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.errors = errors;
  }

  /** Converte o corpo de uma resposta de erro; aceita corpos fora do formato da API. */
  static fromResponse(status: number, body: unknown): ApiError {
    if (isErrorResponse(body)) {
      return new ApiError(status, body.detail, body.errors ?? null);
    }
    return new ApiError(status, fallbackMessage(status));
  }

  /** Falha de rede: servidor fora do ar, CORS bloqueado, sem conexão etc. */
  static network(): ApiError {
    return new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  /** Mensagem de validação de um campo específico, se houver. */
  fieldError(field: string): string | undefined {
    return this.errors?.find((error) => error.field === field)?.message;
  }
}
