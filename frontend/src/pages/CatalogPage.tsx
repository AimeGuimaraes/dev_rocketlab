import { useMovies } from '../api/hooks';
import { PageHeader } from '../components/PageHeader';

export function CatalogPage() {
  // Prova de integração da E10: só o total importa aqui, então basta um item por página.
  const { data, error, isPending } = useMovies({ page: 1, page_size: 1 });

  return (
    <>
      <PageHeader title="Catálogo de filmes" />
      {isPending ? (
        <p className="text-slate-600">Carregando catálogo…</p>
      ) : error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-red-700">
          {error.detail}
        </p>
      ) : (
        <p className="text-slate-600">{data.total.toLocaleString('pt-BR')} filmes no catálogo</p>
      )}
    </>
  );
}
