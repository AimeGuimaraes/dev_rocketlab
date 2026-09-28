/** Exibido na primeira carga, enquanto o chunk da página inicial ainda está sendo baixado. */
export function RouteFallback() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 bg-slate-50 px-4 py-8">
      <p role="status" className="text-sm text-slate-600">
        Carregando página…
      </p>
      <div aria-hidden="true" className="h-8 w-1/2 animate-pulse rounded bg-slate-200" />
    </div>
  );
}
