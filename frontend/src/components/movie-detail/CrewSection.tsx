import { useId, useState } from 'react';

import type { MovieDetail } from '../../api/types';
import { formatInteger } from '../../lib/format';
import { DetailSection } from './DetailSection';

const CAST_PREVIEW = 10;

interface CrewSectionProps {
  movie: Pick<MovieDetail, 'diretores' | 'roteiristas' | 'elenco' | 'produtoras'>;
}

function NameList({ names }: { names: string[] }) {
  return <dd className="mt-1 text-slate-900">{names.join(', ')}</dd>;
}

/** Diretores, roteiristas, elenco (com "Ver elenco completo") e produtoras. */
export function CrewSection({ movie }: CrewSectionProps) {
  const [showFullCast, setShowFullCast] = useState(false);
  const castListId = useId();
  const { diretores, roteiristas, elenco, produtoras } = movie;

  if (
    diretores.length === 0 &&
    roteiristas.length === 0 &&
    elenco.length === 0 &&
    produtoras.length === 0
  ) {
    return null;
  }

  const castIsLong = elenco.length > CAST_PREVIEW;
  const visibleCast = castIsLong && !showFullCast ? elenco.slice(0, CAST_PREVIEW) : elenco;

  return (
    <DetailSection title="Equipe">
      <dl className="grid gap-4 sm:grid-cols-2">
        {diretores.length > 0 && (
          <div>
            <dt className="text-sm font-medium text-slate-500">
              {diretores.length === 1 ? 'Direção' : 'Diretores'}
            </dt>
            <NameList names={diretores} />
          </div>
        )}
        {roteiristas.length > 0 && (
          <div>
            <dt className="text-sm font-medium text-slate-500">Roteiro</dt>
            <NameList names={roteiristas} />
          </div>
        )}
        {produtoras.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-slate-500">Produtoras</dt>
            <NameList names={produtoras} />
          </div>
        )}
        {elenco.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-slate-500">Elenco</dt>
            <dd className="mt-1">
              <ul id={castListId} className="flex flex-wrap gap-1.5">
                {visibleCast.map((name) => (
                  <li
                    key={name}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm text-slate-800"
                  >
                    {name}
                  </li>
                ))}
              </ul>
              {castIsLong && (
                <button
                  type="button"
                  onClick={() => setShowFullCast((value) => !value)}
                  aria-expanded={showFullCast}
                  aria-controls={castListId}
                  className="mt-3 text-sm font-medium text-slate-900 underline hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
                >
                  {showFullCast
                    ? 'Mostrar menos'
                    : `Ver elenco completo (${formatInteger(elenco.length)})`}
                </button>
              )}
            </dd>
          </div>
        )}
      </dl>
    </DetailSection>
  );
}
