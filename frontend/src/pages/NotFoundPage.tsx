import { Link } from 'react-router';

import { PageHeader } from '../components/PageHeader';

export function NotFoundPage() {
  return (
    <div>
      <PageHeader title="Página não encontrada">O endereço acessado não existe.</PageHeader>
      <Link to="/" className="font-medium text-slate-900 underline hover:text-slate-600">
        Voltar ao catálogo
      </Link>
    </div>
  );
}
