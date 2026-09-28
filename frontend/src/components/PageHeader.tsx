import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

/** Título da página com um texto de apoio opcional. */
export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {children && <p className="mt-2 text-slate-600">{children}</p>}
    </div>
  );
}
