const ratingFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export type Currency = 'USD' | 'BRL';

const currencyFormatters: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }),
  BRL: new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }),
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/** Nota de 0 a 10 com uma casa decimal: `8.43` → `"8,4"`. */
export function formatRating(value: number): string {
  return ratingFormatter.format(value);
}

/** Inteiro com separador de milhar: `19129` → `"19.129"`. */
export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

/** Número com uma casa decimal: `123.456` → `"123,5"`. */
export function formatDecimal(value: number): string {
  return ratingFormatter.format(value);
}

/** Valor monetário sem centavos: `(1500000, 'USD')` → `"US$ 1.500.000"`. */
export function formatCurrency(value: number, currency: Currency): string {
  return currencyFormatters[currency].format(value);
}

/**
 * Duração em horas e minutos: `147` → `"2h 27min"`, `120` → `"2h"`, `45` → `"45min"`.
 *
 * Retorna `null` para `0`, valores negativos ou ausentes, que não devem ser exibidos.
 */
export function formatDuration(minutes: number | null): string | null {
  if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) return null;
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest}min`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

/**
 * Data `YYYY-MM-DD` por extenso: `"2010-07-15"` → `"15 de julho de 2010"`.
 *
 * Os componentes são lidos manualmente e a data é montada no fuso local: `new Date("YYYY-MM-DD")`
 * interpreta a string como meia-noite UTC e, no Brasil, mostraria o dia anterior.
 * Retorna `null` se a data estiver ausente ou for inválida.
 */
export function formatDate(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  // Rejeita datas que o construtor "corrige", como 2021-02-30 → 2 de março.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return dateFormatter.format(date);
}

/** Data e hora no fuso local a partir de um instante ISO em UTC: `"…T15:30:00Z"` → `"27/09/2026, 12:30"`. */
export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return Number.isNaN(date.getTime()) ? isoDateTime : dateTimeFormatter.format(date);
}
