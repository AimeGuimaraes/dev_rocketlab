import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, vi } from 'vitest';

import { server } from './server';

// No topo, e não em `beforeAll`: o `openapi-fetch` guarda `globalThis.fetch` quando o cliente é
// criado (ao importar `src/api/client.ts`), antes de qualquer hook rodar. Assim o fetch guardado
// já é o interceptado pelo MSW.
server.listen({ onUnhandledRequest: 'error' });

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(() => {
  server.close();
});

// O jsdom não implementa `showModal`/`close` do `<dialog>`; o polyfill cobre só o que os
// componentes usam: o atributo `open` e o evento `close`.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
}
if (typeof HTMLDialogElement.prototype.close !== 'function') {
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// O jsdom só registra "not implemented"; o catálogo rola para o topo ao trocar de página.
window.scrollTo = () => {};
