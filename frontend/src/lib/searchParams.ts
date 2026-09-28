/** Lê um número de página da URL; qualquer valor que não seja um inteiro ≥ 1 vira a página 1. */
export function parsePageParam(raw: string | null): number {
  if (raw === null || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
