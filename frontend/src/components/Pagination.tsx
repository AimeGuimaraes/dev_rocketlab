import { formatInteger } from '../lib/format';

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

interface PaginationProps {
  page: number;
  pages: number;
  /** Total de itens; quando informado, aparece junto de "Página X de Y". */
  total?: number;
  /** Rótulo dos itens no singular e no plural, ex.: `['filme', 'filmes']`. */
  itemLabel?: [singular: string, plural: string];
  onPageChange: (page: number) => void;
}

const SIBLINGS = 1;

/**
 * Páginas visíveis: a primeira, a última e a vizinhança da atual. Um intervalo de uma página
 * só é mostrado por extenso, porque reticências no lugar de um único número não economizam nada.
 */
function getPageItems(page: number, pages: number): PageItem[] {
  const start = Math.max(2, page - SIBLINGS);
  const end = Math.min(pages - 1, page + SIBLINGS);
  const items: PageItem[] = [1];

  if (start === 3) items.push(2);
  else if (start > 3) items.push('ellipsis-start');

  for (let current = start; current <= end; current++) items.push(current);

  if (end === pages - 2) items.push(pages - 1);
  else if (end < pages - 2) items.push('ellipsis-end');

  if (pages > 1) items.push(pages);
  return items;
}

const buttonBase =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none';
const buttonIdle =
  'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';
const buttonCurrent = 'bg-slate-900 text-white';

/** Navegação entre páginas com anterior/próxima, números e reticências. */
export function Pagination({ page, pages, total, itemLabel, onPageChange }: PaginationProps) {
  const isFirst = page <= 1;
  const isLast = page >= pages;
  const totalText =
    total !== undefined && itemLabel
      ? ` · ${formatInteger(total)} ${total === 1 ? itemLabel[0] : itemLabel[1]}`
      : '';

  return (
    <nav aria-label="Paginação" className="mt-8 flex flex-col items-center gap-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={isFirst}
          className={`${buttonBase} ${buttonIdle}`}
        >
          Anterior
        </button>
        <ul className="hidden items-center gap-1 sm:flex">
          {getPageItems(page, pages).map((item) =>
            typeof item === 'number' ? (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => onPageChange(item)}
                  aria-current={item === page ? 'page' : undefined}
                  aria-label={`Ir para a página ${formatInteger(item)}`}
                  className={`${buttonBase} ${item === page ? buttonCurrent : buttonIdle}`}
                >
                  {formatInteger(item)}
                </button>
              </li>
            ) : (
              <li key={item} aria-hidden="true" className="px-1 text-slate-500">
                …
              </li>
            ),
          )}
        </ul>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={isLast}
          className={`${buttonBase} ${buttonIdle}`}
        >
          Próxima
        </button>
      </div>
      <p className="text-sm text-slate-600" aria-live="polite">
        Página {formatInteger(page)} de {formatInteger(pages)}
        {totalText}
      </p>
    </nav>
  );
}
