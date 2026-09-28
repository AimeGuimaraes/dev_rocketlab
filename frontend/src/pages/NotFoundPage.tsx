import { Link } from 'react-router';

import { PageHeader } from '../components/PageHeader';
import { APP_NAME, useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle(`Página não encontrada · ${APP_NAME}`);

  return (
    <div>
      <PageHeader title="Página não encontrada">O endereço acessado não existe.</PageHeader>
      <Link
        to="/"
        className="font-medium text-slate-900 underline hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none"
      >
        Voltar ao catálogo
      </Link>
    </div>
  );
}
