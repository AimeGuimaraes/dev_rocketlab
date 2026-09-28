import { useNavigate } from 'react-router';

import { useCreateMovie } from '../api/hooks';
import { MovieForm } from '../components/movie-form/MovieForm';
import { PageHeader } from '../components/PageHeader';
import { APP_NAME, useDocumentTitle } from '../hooks/useDocumentTitle';
import type { FlashState } from '../lib/flashMessage';
import { EMPTY_MOVIE_FORM_VALUES, type MovieFormOutput, toMovieCreate } from '../lib/movieSchema';

export function MovieCreatePage() {
  const navigate = useNavigate();
  const createMovie = useCreateMovie();

  useDocumentTitle(`Novo filme · ${APP_NAME}`);

  async function create(values: MovieFormOutput) {
    const movie = await createMovie.mutateAsync(toMovieCreate(values));
    const state: FlashState = { flash: 'Filme cadastrado com sucesso.' };
    // `replace`: voltar no navegador não reabre o formulário já enviado.
    await navigate(`/filmes/${encodeURIComponent(movie.sk_movie_id)}`, { replace: true, state });
  }

  return (
    <>
      <PageHeader title="Novo filme">
        Preencha os dados do filme. Só o título é obrigatório.
      </PageHeader>
      <MovieForm
        mode="create"
        defaultValues={EMPTY_MOVIE_FORM_VALUES}
        onSubmit={create}
        cancelTo="/"
        fallbackErrorMessage="Não foi possível cadastrar o filme. Tente novamente."
      />
    </>
  );
}
