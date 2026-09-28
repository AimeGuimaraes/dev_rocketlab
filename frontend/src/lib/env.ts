const DEFAULT_API_URL = 'http://localhost:8000/api/v1';

/** Configuração lida das variáveis de ambiente do Vite, com valores padrão. */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, ''),
};
