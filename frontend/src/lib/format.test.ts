import { describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatDuration,
  formatInteger,
  formatRating,
} from './format';

/** O Intl usa espaço não separável entre o símbolo e o valor. */
function normalizeSpaces(text: string | null): string | null {
  return text === null ? null : text.replace(/\s/g, ' ');
}

describe('números', () => {
  it('formata nota, inteiro e decimal em pt-BR', () => {
    expect(formatRating(8.43)).toBe('8,4');
    expect(formatRating(10)).toBe('10,0');
    expect(formatInteger(19129)).toBe('19.129');
    expect(formatDecimal(123.456)).toBe('123,5');
  });
});

describe('formatCurrency', () => {
  it('formata dólar e real sem centavos', () => {
    expect(normalizeSpaces(formatCurrency(1_500_000, 'USD'))).toBe('US$ 1.500.000');
    expect(normalizeSpaces(formatCurrency(2_750_000.6, 'BRL'))).toBe('R$ 2.750.001');
  });

  it('formata valores negativos (prejuízo)', () => {
    expect(normalizeSpaces(formatCurrency(-300, 'BRL'))).toBe('-R$ 300');
  });
});

describe('formatDuration', () => {
  it('mostra horas e minutos', () => {
    expect(formatDuration(147)).toBe('2h 27min');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45min');
  });

  it('não exibe durações desconhecidas', () => {
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(-5)).toBeNull();
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(Number.NaN)).toBeNull();
  });
});

describe('formatDate', () => {
  it('mostra o dia certo no fuso do Brasil (sem voltar um dia)', () => {
    // Os testes rodam em America/Sao_Paulo (vitest.config.ts): `new Date('2021-12-16')` seria
    // meia-noite UTC, ou seja, 15 de dezembro às 21h no horário local.
    expect(new Date('2021-12-16').getDate()).toBe(15);
    expect(formatDate('2021-12-16')).toBe('16 de dezembro de 2021');
    expect(formatDate('2010-07-01')).toBe('1 de julho de 2010');
  });

  it('rejeita datas ausentes, mal formatadas ou inexistentes', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate('')).toBeNull();
    expect(formatDate('16/12/2021')).toBeNull();
    expect(formatDate('2021-12-16T00:00:00Z')).toBeNull();
    expect(formatDate('2021-02-30')).toBeNull();
  });
});

describe('formatDateTime', () => {
  it('converte o instante UTC para o horário local', () => {
    expect(formatDateTime('2026-09-27T15:30:00Z')).toBe('27/09/2026, 12:30');
    // Perto da meia-noite UTC, o dia local ainda é o anterior.
    expect(formatDateTime('2026-09-28T01:15:00Z')).toBe('27/09/2026, 22:15');
  });

  it('devolve a entrada quando o valor não é uma data', () => {
    expect(formatDateTime('ontem')).toBe('ontem');
  });
});
