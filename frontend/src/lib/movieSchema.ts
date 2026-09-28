import type { FieldNamesMarkedBoolean } from 'react-hook-form';
import { z } from 'zod';

import type { Genre, MovieCreate, MovieDetail, MovieUpdate } from '../api/types';
import { toGenreOptions } from './genres';

export const TITULO_MAX_LENGTH = 500;
export const DIRETOR_MAX_LENGTH = 255;
export const ANO_MIN = 1800;
export const ANO_MAX = 2100;
export const DURACAO_MIN = 1;
export const SINOPSE_MAX_LENGTH = 4000;
export const URL_MAX_LENGTH = 2048;

const ANO_MESSAGE = `Informe um ano entre ${ANO_MIN} e ${ANO_MAX}.`;
const DURACAO_MESSAGE = 'Informe a duração em minutos (número inteiro, a partir de 1).';
const DATA_MESSAGE = 'Informe uma data válida.';
const URL_MESSAGE = 'Informe uma URL válida começando com http:// ou https://.';

/** URL absoluta com protocolo http ou https. */
export function isHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const { protocol } = new URL(value);
  return protocol === 'http:' || protocol === 'https:';
}

/** Compara nomes de pessoas sem diferenciar maiúsculas nem espaços nas pontas. */
export function isSameName(a: string, b: string): boolean {
  return a.trim().localeCompare(b.trim(), 'pt-BR', { sensitivity: 'accent' }) === 0;
}

/** Inteiro opcional digitado em um `input type="number"`: vazio vira `null`. */
function optionalInteger(min: number, max: number | undefined, message: string) {
  return z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === '') return null;
      const number = Number(value);
      if (!/^\d+$/.test(value) || number < min || (max !== undefined && number > max)) {
        ctx.addIssue({ code: 'custom', message });
        return z.NEVER;
      }
      return number;
    });
}

function optionalUrl() {
  return z
    .string()
    .trim()
    .max(URL_MAX_LENGTH, `A URL deve ter no máximo ${URL_MAX_LENGTH} caracteres.`)
    .refine((value) => value === '' || isHttpUrl(value), URL_MESSAGE)
    .transform((value) => (value === '' ? null : value));
}

/** Schemas de cada campo; também usados para sanear os valores vindos do banco na edição. */
const fieldSchemas = {
  titulo: z
    .string()
    .trim()
    .min(1, 'Informe o título.')
    .max(TITULO_MAX_LENGTH, `O título deve ter no máximo ${TITULO_MAX_LENGTH} caracteres.`),
  diretores: z.array(
    z
      .string()
      .trim()
      .min(1, 'O nome do diretor não pode ficar vazio.')
      .max(
        DIRETOR_MAX_LENGTH,
        `O nome do diretor deve ter no máximo ${DIRETOR_MAX_LENGTH} caracteres.`,
      ),
  ),
  ano_lancamento: optionalInteger(ANO_MIN, ANO_MAX, ANO_MESSAGE),
  genre_ids: z.array(z.string()),
  sinopse: z
    .string()
    .trim()
    .max(SINOPSE_MAX_LENGTH, 'A sinopse deve ter no máximo 4.000 caracteres.')
    .transform((value) => (value === '' ? null : value)),
  duracao_minutos: optionalInteger(DURACAO_MIN, undefined, DURACAO_MESSAGE),
  // O `input type="date"` já entrega `YYYY-MM-DD`; a string segue assim para a API.
  data_lancamento: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), DATA_MESSAGE)
    .transform((value) => (value === '' ? null : value)),
  url_poster: optionalUrl(),
  url_backdrop: optionalUrl(),
};

/**
 * Validação do formulário de filme, espelhando `MovieCreate`/`MovieUpdate` do backend.
 *
 * Os campos são strings (ou listas de strings) enquanto o usuário edita; na saída, textos vêm
 * sem espaços nas pontas, números viram `number` e opcionais vazios viram `null`.
 */
export const movieSchema = z.object(fieldSchemas);

/** Valores do formulário, como o usuário edita. */
export type MovieFormValues = z.input<typeof movieSchema>;
/** Valores validados. */
export type MovieFormOutput = z.output<typeof movieSchema>;
/** Campos alterados, no formato do `formState.dirtyFields` do react-hook-form. */
export type MovieDirtyFields = Partial<Readonly<FieldNamesMarkedBoolean<MovieFormValues>>>;

export const MOVIE_FORM_FIELDS = [
  'titulo',
  'diretores',
  'ano_lancamento',
  'genre_ids',
  'sinopse',
  'duracao_minutos',
  'data_lancamento',
  'url_poster',
  'url_backdrop',
] as const satisfies readonly (keyof MovieFormValues)[];

export const EMPTY_MOVIE_FORM_VALUES: MovieFormValues = {
  titulo: '',
  diretores: [],
  ano_lancamento: '',
  genre_ids: [],
  sinopse: '',
  duracao_minutos: '',
  data_lancamento: '',
  url_poster: '',
  url_backdrop: '',
};

/** Mantém o valor se ele passa no schema do campo; senão, deixa o campo vazio. */
function validOrEmpty(schema: z.ZodType, value: string | number | null | undefined): string {
  const candidate = value === null || value === undefined ? '' : String(value).trim();
  return schema.safeParse(candidate).success ? candidate : '';
}

/** Nomes com trim, sem vazios e sem repetidos. */
function uniqueNames(names: readonly string[]): string[] {
  const result: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed !== '' && !result.some((existing) => isSameName(existing, trimmed))) {
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Preenche o formulário de edição a partir do detalhe do filme.
 *
 * O detalhe traz os gêneros por nome; aqui eles viram `sk_genre_id`, na mesma ordem das
 * opções do formulário. Valores do banco que o formulário recusaria (ex.: duração `0`, usada
 * para "desconhecida") entram vazios: como viram o valor inicial, o campo não fica alterado e
 * não vai no PATCH, e o usuário consegue salvar as outras mudanças.
 */
export function movieToFormValues(movie: MovieDetail, genres: readonly Genre[]): MovieFormValues {
  const movieGenres = new Set(movie.generos);
  const genreIds = toGenreOptions(genres.filter((genre) => movieGenres.has(genre.nome_genero))).map(
    (option) => option.id,
  );

  return {
    // Obrigatório: não dá para esvaziar; se vier inválido, o erro aparece ao salvar.
    titulo: movie.titulo.trim(),
    diretores: uniqueNames(movie.diretores),
    ano_lancamento: validOrEmpty(fieldSchemas.ano_lancamento, movie.ano_lancamento),
    genre_ids: genreIds,
    // Uma sinopse acima do limite é mantida (esvaziar perderia o texto); o contador avisa.
    sinopse: movie.sinopse?.trim() ?? '',
    duracao_minutos: validOrEmpty(fieldSchemas.duracao_minutos, movie.duracao_minutos),
    data_lancamento: validOrEmpty(fieldSchemas.data_lancamento, movie.data_lancamento),
    url_poster: validOrEmpty(fieldSchemas.url_poster, movie.url_poster),
    url_backdrop: validOrEmpty(fieldSchemas.url_backdrop, movie.url_backdrop),
  };
}

/** Corpo do POST: campos opcionais vazios não são enviados. */
export function toMovieCreate(values: MovieFormOutput): MovieCreate {
  const body: MovieCreate = { titulo: values.titulo };
  if (values.diretores.length > 0) body.diretores = values.diretores;
  if (values.ano_lancamento !== null) body.ano_lancamento = values.ano_lancamento;
  if (values.genre_ids.length > 0) body.genre_ids = values.genre_ids;
  if (values.sinopse !== null) body.sinopse = values.sinopse;
  if (values.duracao_minutos !== null) body.duracao_minutos = values.duracao_minutos;
  if (values.data_lancamento !== null) body.data_lancamento = values.data_lancamento;
  if (values.url_poster !== null) body.url_poster = values.url_poster;
  if (values.url_backdrop !== null) body.url_backdrop = values.url_backdrop;
  return body;
}

/** O react-hook-form marca listas como `boolean[]` (um item por posição). */
function isDirty(flag: boolean | readonly (boolean | undefined)[] | undefined): boolean {
  return Array.isArray(flag) ? flag.some(Boolean) : Boolean(flag);
}

/**
 * Corpo do PATCH: só os campos alterados. Um opcional esvaziado vai como `null` (limpa o
 * valor); listas vão sempre como lista, e a lista vazia remove todos os itens.
 */
export function toMovieUpdate(values: MovieFormOutput, dirty: MovieDirtyFields): MovieUpdate {
  const body: MovieUpdate = {};
  if (isDirty(dirty.titulo)) body.titulo = values.titulo;
  if (isDirty(dirty.diretores)) body.diretores = values.diretores;
  if (isDirty(dirty.ano_lancamento)) body.ano_lancamento = values.ano_lancamento;
  if (isDirty(dirty.genre_ids)) body.genre_ids = values.genre_ids;
  if (isDirty(dirty.sinopse)) body.sinopse = values.sinopse;
  if (isDirty(dirty.duracao_minutos)) body.duracao_minutos = values.duracao_minutos;
  if (isDirty(dirty.data_lancamento)) body.data_lancamento = values.data_lancamento;
  if (isDirty(dirty.url_poster)) body.url_poster = values.url_poster;
  if (isDirty(dirty.url_backdrop)) body.url_backdrop = values.url_backdrop;
  return body;
}
