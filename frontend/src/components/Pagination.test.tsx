import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './Pagination';

function renderPagination(page: number, pages: number, total?: number) {
  const onPageChange = vi.fn<(page: number) => void>();
  render(
    <Pagination
      page={page}
      pages={pages}
      total={total}
      itemLabel={['filme', 'filmes']}
      onPageChange={onPageChange}
    />,
  );
  return { onPageChange };
}

/** Itens da lista na ordem: número da página ou `…`. */
function visibleItems(): string[] {
  const list = within(screen.getByRole('navigation', { name: 'Paginação' })).getByRole('list');
  return within(list)
    .getAllByRole('listitem', { hidden: true })
    .map((item) => item.textContent ?? '');
}

describe('Pagination', () => {
  it('mostra reticências dos dois lados no meio de muitas páginas', () => {
    renderPagination(5, 10);
    expect(visibleItems()).toEqual(['1', '…', '4', '5', '6', '…', '10']);
  });

  it('mostra o número em vez de reticências quando só uma página ficaria de fora', () => {
    renderPagination(4, 10);
    expect(visibleItems()).toEqual(['1', '2', '3', '4', '5', '…', '10']);
  });

  it('mostra todas as páginas quando são poucas', () => {
    renderPagination(1, 3);
    expect(visibleItems()).toEqual(['1', '2', '3']);
  });

  it('esconde as reticências do leitor de tela', () => {
    renderPagination(5, 10);
    const ellipses = screen.getAllByText('…');
    expect(ellipses).toHaveLength(2);
    for (const ellipsis of ellipses) expect(ellipsis).toHaveAttribute('aria-hidden', 'true');
  });

  it('desabilita "Anterior" na primeira página', () => {
    renderPagination(1, 10);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled();
  });

  it('desabilita "Próxima" na última página', () => {
    renderPagination(10, 10);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('marca só a página atual com aria-current', () => {
    renderPagination(5, 10);
    expect(screen.getByRole('button', { name: 'Ir para a página 5' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const others = screen
      .getAllByRole('button', { name: /^Ir para a página/ })
      .filter((button) => button.hasAttribute('aria-current'));
    expect(others).toHaveLength(1);
  });

  it('chama onPageChange com a página escolhida', async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination(5, 10);
    await user.click(screen.getByRole('button', { name: 'Próxima' }));
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    await user.click(screen.getByRole('button', { name: 'Ir para a página 10' }));
    expect(onPageChange.mock.calls).toEqual([[6], [4], [10]]);
  });

  it('mostra a posição e o total com separador de milhar', () => {
    renderPagination(2, 1200, 23_981);
    expect(screen.getByText('Página 2 de 1.200 · 23.981 filmes')).toBeInTheDocument();
  });
});
