const ratingFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** Nota de 0 a 10 com uma casa decimal: `8.43` → `"8,4"`. */
export function formatRating(value: number): string {
  return ratingFormatter.format(value);
}

/** Inteiro com separador de milhar: `19129` → `"19.129"`. */
export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}
