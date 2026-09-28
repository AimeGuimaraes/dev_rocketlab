import { describe, expect, it } from 'vitest';

import { genres, movieDetail } from '../test/fixtures';
import {
  EMPTY_MOVIE_FORM_VALUES,
  type MovieFormValues,
  movieSchema,
  movieToFormValues,
  toMovieCreate,
  toMovieUpdate,
} from './movieSchema';

function parse(values: Partial<MovieFormValues>) {
  return movieSchema.parse({ ...EMPTY_MOVIE_FORM_VALUES, ...values });
}

describe('movieToFormValues', () => {
  it('preenche o formulário a partir do detalhe', () => {
    expect(movieToFormValues(movieDetail, genres)).toEqual({
      titulo: 'O Voo da Coruja',
      // Repetidos (sem diferenciar maiúsculas nem espaços) são removidos.
      diretores: ['Fulana de Tal', 'Beltrano'],
      ano_lancamento: '2021',
      // Nome → id, na ordem das opções traduzidas: "Ação" antes de "Ficção científica".
      genre_ids: ['g-action', 'g-scifi'],
      sinopse: 'Uma coruja atravessa o país.',
      // `0` significa "desconhecida" no banco e o formulário recusaria: entra vazio.
      duracao_minutos: '',
      data_lancamento: '2021-12-16',
      url_poster: 'https://example.com/poster.jpg',
      url_backdrop: '',
    });
  });

  it('ignora gêneros que não existem na lista e esvazia valores inválidos', () => {
    const values = movieToFormValues(
      {
        ...movieDetail,
        generos: ['Western'],
        ano_lancamento: 1500,
        url_poster: 'ftp://example.com/poster.jpg',
        sinopse: null,
      },
      genres,
    );
    expect(values.genre_ids).toEqual([]);
    expect(values.ano_lancamento).toBe('');
    expect(values.url_poster).toBe('');
    expect(values.sinopse).toBe('');
  });

  it('o resultado passa na validação mesmo com duração 0', () => {
    expect(movieSchema.safeParse(movieToFormValues(movieDetail, genres)).success).toBe(true);
  });
});

describe('movieSchema', () => {
  it('valida com mensagens em pt-BR', () => {
    const result = movieSchema.safeParse({
      ...EMPTY_MOVIE_FORM_VALUES,
      titulo: '   ',
      ano_lancamento: '99',
      duracao_minutos: '0',
      url_poster: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => [issue.path.join('.'), issue.message]);
    expect(messages).toEqual([
      ['titulo', 'Informe o título.'],
      ['ano_lancamento', 'Informe um ano entre 1800 e 2100.'],
      ['duracao_minutos', 'Informe a duração em minutos (número inteiro, a partir de 1).'],
      ['url_poster', 'Informe uma URL válida começando com http:// ou https://.'],
    ]);
  });
});

describe('toMovieCreate', () => {
  it('envia só o título quando os opcionais estão vazios', () => {
    expect(toMovieCreate(parse({ titulo: '  Novo filme  ' }))).toEqual({ titulo: 'Novo filme' });
  });

  it('converte números e mantém os preenchidos', () => {
    expect(
      toMovieCreate(
        parse({
          titulo: 'Novo filme',
          diretores: [' Fulana '],
          ano_lancamento: '2024',
          genre_ids: ['g-drama'],
          sinopse: ' Sinopse. ',
          duracao_minutos: '95',
          data_lancamento: '2024-05-10',
          url_poster: 'https://example.com/p.jpg',
        }),
      ),
    ).toEqual({
      titulo: 'Novo filme',
      diretores: ['Fulana'],
      ano_lancamento: 2024,
      genre_ids: ['g-drama'],
      sinopse: 'Sinopse.',
      duracao_minutos: 95,
      data_lancamento: '2024-05-10',
      url_poster: 'https://example.com/p.jpg',
    });
  });
});

describe('toMovieUpdate', () => {
  const values = parse({
    titulo: 'Título',
    diretores: ['Fulana', 'Beltrano'],
    ano_lancamento: '2020',
    sinopse: '',
    genre_ids: [],
  });

  it('sem campos alterados, envia um corpo vazio', () => {
    expect(toMovieUpdate(values, {})).toEqual({});
  });

  it('envia só os campos sujos, com `null` para limpar opcionais', () => {
    expect(
      toMovieUpdate(values, { sinopse: true, ano_lancamento: true, url_poster: false }),
    ).toEqual({ sinopse: null, ano_lancamento: 2020 });
  });

  it('trata listas marcadas por posição e envia a lista inteira (vazia remove todos)', () => {
    expect(toMovieUpdate(values, { diretores: [false, true], genre_ids: [true] })).toEqual({
      diretores: ['Fulana', 'Beltrano'],
      genre_ids: [],
    });
    expect(toMovieUpdate(values, { diretores: [false, false] })).toEqual({});
  });
});
