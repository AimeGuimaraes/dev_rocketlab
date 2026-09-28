/** Classes compartilhadas pelos formulários (avaliação e filme). */
export const labelClass = 'block text-sm font-medium text-slate-900';
export const errorClass = 'mt-1 text-sm text-red-700';
export const hintClass = 'mt-1 text-sm text-slate-500';

export const primaryButtonClass =
  'inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60';
export const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 ring-1 ring-slate-300 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none';

/** Campo de texto com borda vermelha quando inválido. */
export function textFieldClass(invalid: boolean): string {
  return `mt-1 block w-full rounded-md bg-white px-3 py-2 text-slate-900 ring-1 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:outline-none ${
    invalid
      ? 'ring-red-500 focus-visible:ring-red-600'
      : 'ring-slate-300 focus-visible:ring-slate-900'
  }`;
}
