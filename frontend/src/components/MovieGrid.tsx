import { Children, type ReactNode } from 'react';

interface MovieGridProps {
  children: ReactNode;
  /** Esmaece a grade enquanto a próxima página carrega por cima da atual. */
  busy?: boolean;
}

/** Grade responsiva do catálogo: 2 colunas no celular, até 5 no desktop. */
export function MovieGrid({ children, busy = false }: MovieGridProps) {
  return (
    <ul
      aria-busy={busy}
      className={`grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${busy ? 'opacity-50' : ''}`}
    >
      {Children.map(children, (child) => (
        <li>{child}</li>
      ))}
    </ul>
  );
}
