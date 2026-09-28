import { describe, expect, it } from 'vitest';

import { genres } from '../test/fixtures';
import { toGenreOptions, translateGenre } from './genres';

describe('translateGenre', () => {
  it('traduz os gêneros conhecidos', () => {
    expect(translateGenre('Action')).toBe('Ação');
    expect(translateGenre('Science Fiction')).toBe('Ficção científica');
    expect(translateGenre('Tv Movie')).toBe('Filme para TV');
  });

  it('mantém o nome original quando não há tradução', () => {
    expect(translateGenre('Kaiju')).toBe('Kaiju');
    expect(translateGenre('action')).toBe('action');
    // Chaves herdadas de Object não contam como tradução.
    expect(translateGenre('toString')).toBe('toString');
  });
});

describe('toGenreOptions', () => {
  it('usa os nomes traduzidos em ordem alfabética pt-BR', () => {
    expect(toGenreOptions(genres)).toEqual([
      { id: 'g-action', label: 'Ação' },
      { id: 'g-comedy', label: 'Comédia' },
      { id: 'g-drama', label: 'Drama' },
      { id: 'g-scifi', label: 'Ficção científica' },
    ]);
  });
});
