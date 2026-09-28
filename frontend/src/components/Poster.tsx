import { useState } from 'react';

/** Até duas iniciais do título, para o poster de reserva. */
function initials(title: string): string {
  const words = title.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function FilmIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className="size-8"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

interface PosterProps {
  title: string;
  url: string | null;
  /** `eager` para posters visíveis logo ao abrir a página (ex.: detalhe do filme). */
  loading?: 'lazy' | 'eager';
}

/** Pôster do filme; sem URL ou com imagem quebrada, mostra ícone e iniciais do título. */
export function Poster({ title, url, loading = 'lazy' }: PosterProps) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        aria-hidden="true"
        className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600"
      >
        <FilmIcon />
        <span className="text-2xl font-bold tracking-wide">{initials(title)}</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Pôster de ${title}`}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}
