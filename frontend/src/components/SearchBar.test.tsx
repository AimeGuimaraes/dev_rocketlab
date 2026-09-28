import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchBar } from './SearchBar';

const DEBOUNCE_MS = 300;

// Aqui os eventos são disparados com `fireEvent` (síncrono): o `user-event` passa pelo
// `asyncWrapper` do Testing Library, que espera um `setTimeout(0)` que os fake timers do Vitest
// nunca disparam sozinhos. Assim o tempo só anda com `advance`, sob controle do teste.
function setup(value = '') {
  const onSearch = vi.fn<(value: string) => void>();
  render(<SearchBar value={value} onSearch={onSearch} />);
  const input = screen.getByRole('searchbox', { name: 'Buscar por título' });
  const type = (text: string) => fireEvent.change(input, { target: { value: text } });
  return { onSearch, input, type };
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('aplica a busca só depois do debounce, com o texto normalizado', () => {
    const { onSearch, type } = setup();
    type('  coruja ');
    advance(DEBOUNCE_MS - 1);
    expect(onSearch).not.toHaveBeenCalled();

    advance(1);
    expect(onSearch.mock.calls).toEqual([['coruja']]);
  });

  it('reinicia o debounce a cada alteração e aplica só o texto final', () => {
    const { onSearch, type } = setup();
    type('noi');
    advance(DEBOUNCE_MS - 50);
    type('noite');
    advance(DEBOUNCE_MS - 50);
    expect(onSearch).not.toHaveBeenCalled();

    advance(50);
    expect(onSearch.mock.calls).toEqual([['noite']]);
  });

  it('Enter aplica na hora e não repete depois do debounce', () => {
    const { onSearch, input, type } = setup();
    type('matrix');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch.mock.calls).toEqual([['matrix']]);

    advance(DEBOUNCE_MS * 2);
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('não aplica quando o texto normalizado é igual à busca atual', () => {
    const { onSearch, input, type } = setup('coruja');
    expect(input).toHaveValue('coruja');
    type('coruja ');
    advance(DEBOUNCE_MS);
    expect(onSearch).not.toHaveBeenCalled();
    // O espaço digitado continua no campo.
    expect(input).toHaveValue('coruja ');
  });

  it('"Limpar busca" cancela o debounce pendente', () => {
    const { onSearch, input, type } = setup();
    type('coruja');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    advance(DEBOUNCE_MS * 2);

    expect(onSearch).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Limpar busca' })).not.toBeInTheDocument();
  });

  it('"Limpar busca" remove a busca já aplicada', () => {
    const onSearch = vi.fn<(value: string) => void>();
    // Como no catálogo, a busca aplicada (a URL) acompanha o que o `onSearch` recebe.
    function Controlled() {
      const [value, setValue] = useState('coruja');
      return (
        <SearchBar
          value={value}
          onSearch={(next) => {
            onSearch(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Controlled />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
    advance(DEBOUNCE_MS * 2);
    expect(onSearch.mock.calls).toEqual([['']]);
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('acompanha a busca quando ela muda por fora (ex.: voltar do navegador)', () => {
    const onSearch = vi.fn<(value: string) => void>();
    const { rerender } = render(<SearchBar value="coruja" onSearch={onSearch} />);
    rerender(<SearchBar value="noite" onSearch={onSearch} />);
    expect(screen.getByRole('searchbox')).toHaveValue('noite');
    advance(DEBOUNCE_MS);
    expect(onSearch).not.toHaveBeenCalled();
  });
});
