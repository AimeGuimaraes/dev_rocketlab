/** Placeholder no formato da página de detalhe, exibido enquanto o filme carrega. */
export function MovieDetailSkeleton() {
  return (
    <div aria-hidden="true" className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col items-center gap-6 rounded-xl bg-slate-200 p-5 sm:flex-row sm:items-end sm:p-8">
        <div className="aspect-[2/3] w-44 shrink-0 rounded-lg bg-slate-300 sm:w-52" />
        <div className="flex w-full flex-col items-center gap-3 sm:items-start">
          <div className="h-8 w-3/4 rounded bg-slate-300 sm:w-1/2" />
          <div className="h-4 w-40 rounded bg-slate-300" />
          <div className="h-4 w-52 rounded bg-slate-300" />
          <div className="flex gap-1.5">
            <div className="h-5 w-16 rounded-full bg-slate-300" />
            <div className="h-5 w-20 rounded-full bg-slate-300" />
          </div>
          <div className="h-10 w-56 rounded-lg bg-slate-300" />
        </div>
      </div>
      {[4, 3, 5].map((lines, section) => (
        <div key={section} className="rounded-lg bg-white p-5 ring-1 ring-slate-200">
          <div className="mb-4 h-5 w-32 rounded bg-slate-200" />
          {Array.from({ length: lines }, (_, line) => (
            <div
              key={line}
              className={`mt-2 h-3.5 rounded bg-slate-200 ${line === lines - 1 ? 'w-2/3' : 'w-full'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
