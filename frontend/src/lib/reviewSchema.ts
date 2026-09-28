import { z } from 'zod';

export const NOME_MAX_LENGTH = 120;
export const COMENTARIO_MAX_LENGTH = 4000;
export const NOTA_MIN = 0;
export const NOTA_MAX = 10;
export const NOTA_STEP = 0.5;

const NOTA_REQUIRED_MESSAGE = 'Escolha uma nota de 0 a 10.';

/**
 * Validação do formulário de avaliação, espelhando o `ReviewCreate` do backend: textos sem
 * espaços nas pontas, nome com 1–120 caracteres, resenha com 1–4000 e nota de 0 a 10.
 *
 * A nota começa `null` (o usuário precisa escolher) e sai como `number` depois de validada.
 */
export const reviewSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Informe seu nome.')
    .max(NOME_MAX_LENGTH, `O nome deve ter no máximo ${NOME_MAX_LENGTH} caracteres.`),
  nota: z
    .number(NOTA_REQUIRED_MESSAGE)
    .min(NOTA_MIN, NOTA_REQUIRED_MESSAGE)
    .max(NOTA_MAX, NOTA_REQUIRED_MESSAGE)
    .multipleOf(NOTA_STEP, 'A nota deve variar de 0,5 em 0,5.')
    .nullable()
    .transform((value, ctx) => {
      if (value === null) {
        ctx.addIssue({ code: 'custom', message: NOTA_REQUIRED_MESSAGE });
        return z.NEVER;
      }
      return value;
    }),
  comentario: z
    .string()
    .trim()
    .min(1, 'Escreva sua resenha.')
    .max(COMENTARIO_MAX_LENGTH, 'A resenha deve ter no máximo 4.000 caracteres.'),
});

/** Valores do formulário (nota `null` enquanto não escolhida). */
export type ReviewFormValues = z.input<typeof reviewSchema>;
/** Valores validados, prontos para o `POST` de avaliação. */
export type ReviewFormOutput = z.output<typeof reviewSchema>;
