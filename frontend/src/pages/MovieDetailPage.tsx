import { useParams } from 'react-router';

import { PageHeader } from '../components/PageHeader';

export function MovieDetailPage() {
  const { id } = useParams();

  return (
    <PageHeader title="Detalhes do filme">
      Em breve: os detalhes e as avaliações do filme <code className="font-mono">{id}</code>.
    </PageHeader>
  );
}
