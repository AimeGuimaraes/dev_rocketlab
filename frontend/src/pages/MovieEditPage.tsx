import { useParams } from 'react-router';

import { PageHeader } from '../components/PageHeader';

export function MovieEditPage() {
  const { id } = useParams();

  return (
    <PageHeader title="Editar filme">
      Em breve: o formulário de edição do filme <code className="font-mono">{id}</code>.
    </PageHeader>
  );
}
