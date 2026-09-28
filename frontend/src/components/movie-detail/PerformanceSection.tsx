import type { MoviePerformance } from '../../api/types';
import {
  type Currency,
  formatCurrency,
  formatDecimal,
  formatInteger,
  formatRating,
} from '../../lib/format';
import { DetailSection } from './DetailSection';

const EMPTY = '—';

interface PerformanceSectionProps {
  performance: MoviePerformance;
}

interface MoneyRow {
  label: string;
  usd: number | null;
  brl: number | null;
  /** Destaca valores negativos em vermelho (prejuízo). */
  signed?: boolean;
}

function MoneyCell({
  value,
  currency,
  signed,
}: {
  value: number | null;
  currency: Currency;
  signed: boolean;
}) {
  if (value === null) return <td className="px-3 py-2 text-right text-slate-500">{EMPTY}</td>;
  const negative = signed && value < 0;
  return (
    <td
      className={`px-3 py-2 text-right tabular-nums ${negative ? 'font-medium text-red-700' : 'text-slate-900'}`}
    >
      {formatCurrency(value, currency)}
    </td>
  );
}

/** Nota externa com a quantidade de votos: `"7,8 · 12.345 votos"`. */
function externalRating(rating: number | null, votes: number | null): string {
  if (rating === null) return EMPTY;
  const text = formatRating(rating);
  if (votes === null) return text;
  return `${text} · ${formatInteger(votes)} ${votes === 1 ? 'voto' : 'votos'}`;
}

/** Orçamento, receita e lucro (USD e BRL), popularidade e notas TMDB/IMDb. */
export function PerformanceSection({ performance }: PerformanceSectionProps) {
  const rows: MoneyRow[] = [
    { label: 'Orçamento', usd: performance.orcamento_usd, brl: performance.orcamento_brl },
    { label: 'Receita', usd: performance.receita_usd, brl: performance.receita_brl },
    { label: 'Lucro', usd: performance.lucro_usd, brl: performance.lucro_brl, signed: true },
  ];

  const stats = [
    {
      label: 'Popularidade',
      value: performance.popularidade === null ? EMPTY : formatDecimal(performance.popularidade),
    },
    { label: 'Nota TMDB', value: externalRating(performance.nota_tmdb, performance.qtd_tmdb) },
    { label: 'Nota IMDb', value: externalRating(performance.nota_imdb, performance.qtd_imdb) },
  ];

  return (
    <DetailSection title="Dados financeiros e notas externas">
      {/* Em telas estreitas a tabela rola na horizontal; o foco permite rolar pelo teclado. */}
      <div
        role="region"
        aria-label="Valores financeiros"
        tabIndex={0}
        className="overflow-x-auto rounded-md focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
      >
        <table className="w-full min-w-[20rem] text-sm">
          <caption className="sr-only">Valores financeiros em dólar e em real</caption>
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th scope="col" className="px-3 py-2 text-left font-medium">
                <span className="sr-only">Indicador</span>
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                USD
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                BRL
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="px-3 py-2 text-left font-medium text-slate-700">
                  {row.label}
                </th>
                <MoneyCell value={row.usd} currency="USD" signed={row.signed ?? false} />
                <MoneyCell value={row.brl} currency="BRL" signed={row.signed ?? false} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm font-medium text-slate-500">{stat.label}</dt>
            <dd className="mt-1 text-slate-900 tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </DetailSection>
  );
}
