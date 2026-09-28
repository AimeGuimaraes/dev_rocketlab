import { formatInteger, formatRating } from '../lib/format';

type RatingSize = 'sm' | 'md';

interface RatingDisplayProps {
  /** Nota média de 0 a 10; `null` quando o filme ainda não foi avaliado. */
  value: number | null;
  /** Quantidade de avaliações; entra no rótulo acessível e, com `showCount`, no texto. */
  count?: number;
  showCount?: boolean;
  size?: RatingSize;
}

const STAR_COUNT = 5;

const sizeClasses: Record<RatingSize, { star: string; text: string }> = {
  sm: { star: 'size-3.5', text: 'text-sm' },
  md: { star: 'size-5', text: 'text-lg' },
};

const STAR_PATH =
  'M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.8l-5.2 2.8 1-5.8L1.5 7.7l5.9-.9L10 1.5z';

function StarIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d={STAR_PATH} />
    </svg>
  );
}

/** Preenchimento de cada estrela (0, 0,5 ou 1) para uma nota de 0 a 10. */
function starFills(value: number): number[] {
  const stars = value / 2;
  return Array.from({ length: STAR_COUNT }, (_, index) => {
    const fill = Math.min(Math.max(stars - index, 0), 1);
    return Math.round(fill * 2) / 2;
  });
}

function reviewCountLabel(count: number): string {
  return `${formatInteger(count)} ${count === 1 ? 'avaliação' : 'avaliações'}`;
}

/** Nota média (0–10) em número, com 5 estrelas como apoio visual (nota ÷ 2). */
export function RatingDisplay({
  value,
  count,
  showCount = false,
  size = 'md',
}: RatingDisplayProps) {
  const classes = sizeClasses[size];

  if (value === null || count === 0) {
    return <span className={`${classes.text} text-slate-500`}>Sem avaliações</span>;
  }

  const formatted = formatRating(value);
  const label =
    count === undefined
      ? `Nota ${formatted} de 10`
      : `Nota ${formatted} de 10, ${reviewCountLabel(count)}`;

  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-1.5">
      <span className="flex text-amber-500">
        {starFills(value).map((fill, index) => (
          <span key={index} className={`relative ${classes.star}`}>
            <StarIcon className={`absolute inset-0 ${classes.star} text-slate-300`} />
            {fill > 0 && (
              <span
                className={`absolute inset-y-0 left-0 overflow-hidden ${fill < 1 ? 'w-1/2' : 'w-full'}`}
              >
                <StarIcon className={classes.star} />
              </span>
            )}
          </span>
        ))}
      </span>
      <span className={`${classes.text} font-semibold text-slate-900`}>{formatted}</span>
      {showCount && count !== undefined && (
        <span className={`${classes.text} text-slate-500`}>({reviewCountLabel(count)})</span>
      )}
    </span>
  );
}
