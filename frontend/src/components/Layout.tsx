import { type MouseEvent, type RefObject, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigation } from 'react-router';

const focusRing =
  'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none';

function navLinkClass({ isActive }: { isActive: boolean }) {
  const base = `inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors ${focusRing}`;
  return isActive
    ? `${base} bg-slate-900 text-white`
    : `${base} text-slate-700 hover:bg-slate-200 hover:text-slate-900`;
}

const FALLBACK_ANNOUNCEMENT = 'Página carregada';

/**
 * Ao trocar de rota, leva o foco ao `h1` da nova página; o leitor de tela já lê o título
 * focado, então nada é anunciado. Sem `h1` (ex.: página ainda carregando), foca o `main` e
 * anuncia a troca pela região `aria-live`: o novo `document.title`, se a página já o definiu,
 * ou um aviso genérico. Mudanças só na query string (filtros, paginação) não movem o foco.
 */
function useRouteFocus(
  mainRef: RefObject<HTMLElement | null>,
  announcerRef: RefObject<HTMLElement | null>,
) {
  const { pathname } = useLocation();
  const lastPathname = useRef(pathname);
  const lastTitle = useRef<string | null>(null);

  useEffect(() => {
    // Na primeira renderização o foco fica onde o navegador colocou.
    if (lastPathname.current === pathname) {
      lastTitle.current ??= document.title;
      return;
    }
    lastPathname.current = pathname;
    // Os efeitos da página rodam antes deste, então o título dela já está aplicado.
    const previousTitle = lastTitle.current;
    const title = document.title;
    lastTitle.current = title;

    const main = mainRef.current;
    const announcer = announcerRef.current;
    if (!main) return;
    const heading = main.querySelector('h1');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus();
      if (announcer) announcer.textContent = '';
    } else {
      main.focus();
      if (announcer) {
        announcer.textContent = title && title !== previousTitle ? title : FALLBACK_ANNOUNCEMENT;
      }
    }
  }, [pathname, mainRef, announcerRef]);
}

/** Estrutura comum das páginas: cabeçalho com navegação e área de conteúdo centralizada. */
export function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  const announcerRef = useRef<HTMLParagraphElement>(null);
  useRouteFocus(mainRef, announcerRef);
  const navigation = useNavigation();

  function skipToContent(event: MouseEvent<HTMLAnchorElement>) {
    // Foca o `main` sem acrescentar `#conteudo` à URL.
    event.preventDefault();
    mainRef.current?.focus();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a
        href="#conteudo"
        onClick={skipToContent}
        className={`sr-only rounded-md bg-slate-900 px-4 py-3 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 ${focusRing}`}
      >
        Pular para o conteúdo
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className={`rounded-md text-lg font-bold tracking-tight ${focusRing}`}>
            RocketLab Filmes
          </Link>
          <nav aria-label="Principal" className="flex flex-wrap gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Catálogo
            </NavLink>
            <NavLink to="/filmes/novo" className={navLinkClass}>
              Novo filme
            </NavLink>
          </nav>
        </div>
      </header>
      <main
        ref={mainRef}
        id="conteudo"
        tabIndex={-1}
        // Enquanto o chunk da próxima página é baixado, a atual continua na tela.
        aria-busy={navigation.state === 'loading'}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8"
      >
        <Outlet />
      </main>
      <p ref={announcerRef} role="status" aria-live="polite" className="sr-only" />
    </div>
  );
}
