/** Indica se o usuário pediu menos movimento; sem `matchMedia` (ex.: jsdom), assume que não. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
