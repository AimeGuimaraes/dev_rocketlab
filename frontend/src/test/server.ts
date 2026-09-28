import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** Servidor MSW compartilhado pelos testes (iniciado em `setup.ts`). */
export const server = setupServer(...handlers);
