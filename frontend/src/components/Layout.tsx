import { Link, NavLink, Outlet } from 'react-router';

function navLinkClass({ isActive }: { isActive: boolean }) {
  const base = 'rounded-md px-3 py-2 text-sm font-medium transition-colors';
  return isActive
    ? `${base} bg-slate-900 text-white`
    : `${base} text-slate-700 hover:bg-slate-200 hover:text-slate-900`;
}

/** Estrutura comum das páginas: cabeçalho com navegação e área de conteúdo centralizada. */
export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            RocketLab Filmes
          </Link>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Catálogo
            </NavLink>
            <NavLink to="/filmes/novo" className={navLinkClass}>
              Novo filme
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
