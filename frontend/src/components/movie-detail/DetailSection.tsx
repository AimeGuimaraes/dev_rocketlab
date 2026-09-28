import type { ReactNode } from 'react';
import { useId } from 'react';

interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

/** Bloco com título usado nas seções da página de detalhe. */
export function DetailSection({ title, children }: DetailSectionProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200"
    >
      <h2 id={headingId} className="mb-4 text-lg font-semibold text-slate-900">
        {title}
      </h2>
      {children}
    </section>
  );
}
