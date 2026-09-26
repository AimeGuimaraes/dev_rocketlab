"""Regras de negócio do domínio de filmes."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page
from app.core.errors import InvalidReferenceError, NotFoundError
from app.movies import repository
from app.movies.models import DimGenre, DimMovie, DimPerson
from app.movies.schemas import (
    DEFAULT_ORDER,
    MovieCreate,
    MovieDetail,
    MovieFilters,
    MovieListItem,
    MoviePerformance,
    MovieSort,
    MovieUpdate,
    SortOrder,
)


async def list_movies(
    session: AsyncSession,
    page: int,
    page_size: int,
    filters: MovieFilters,
    sort: MovieSort = MovieSort.popularidade,
    order: SortOrder | None = None,
) -> Page[MovieListItem]:
    """Devolve uma página do catálogo filtrado e ordenado.

    Sem ``order``, usa a direção padrão do campo (``titulo`` crescente, demais decrescente).
    Uma busca ``q`` vazia ou só com espaços é ignorada.
    """

    q = filters.q.strip() if filters.q is not None else None
    filters = MovieFilters(q=q or None, genre_id=filters.genre_id, year=filters.year)
    order = order or DEFAULT_ORDER[sort]

    total = await repository.count_movies(session, filters)
    rows = await repository.list_movies(
        session,
        filters,
        sort=sort,
        order=order,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    items = [
        MovieListItem(
            sk_movie_id=movie.sk_movie_id,
            titulo=movie.titulo,
            ano_lancamento=movie.ano_lancamento,
            url_poster=movie.url_poster,
            generos=[genre.nome_genero for genre in movie.genres],
            nota_media=media,
            qtd_avaliacoes=quantidade,
        )
        for movie, media, quantidade in rows
    ]
    return Page[MovieListItem].create(items, total=total, page=page, page_size=page_size)


async def get_movie(session: AsyncSession, sk_movie_id: str) -> MovieDetail:
    """Devolve o detalhe completo de um filme.

    As pessoas são separadas por ``tipo_pessoa`` e cada lista é ordenada por nome.
    Levanta ``NotFoundError`` se o filme não existir.
    """

    return _to_detail(await _get_movie_or_404(session, sk_movie_id))


async def create_movie(session: AsyncSession, data: MovieCreate) -> MovieDetail:
    """Cadastra um filme com seus gêneros e diretores e devolve o detalhe.

    O ``id_filme`` é gerado aqui. Filmes novos não têm performance nem resumo de
    avaliações. Levanta ``InvalidReferenceError`` se algum gênero não existir.
    """

    async with _transaction(session):
        genres = await _resolve_genres(session, data.genre_ids)
        directors = await _get_or_create_directors(session, data.diretores)
        movie = DimMovie(
            id_filme=_generate_id_filme(),
            **data.model_dump(exclude={"diretores", "genre_ids"}),
            genres=genres,
            people=directors,
        )
        session.add(movie)
    return await get_movie(session, movie.sk_movie_id)


async def update_movie(session: AsyncSession, sk_movie_id: str, data: MovieUpdate) -> MovieDetail:
    """Atualiza só os campos enviados e devolve o detalhe.

    ``diretores`` substitui apenas os vínculos de diretor (elenco e roteiristas ficam);
    ``genre_ids`` substitui todos os gêneros. Levanta ``NotFoundError`` se o filme não
    existir e ``InvalidReferenceError`` se algum gênero não existir.
    """

    changes = data.changes()
    async with _transaction(session):
        movie = await _get_movie_or_404(session, sk_movie_id)
        if "genre_ids" in changes:
            movie.genres = await _resolve_genres(session, changes.pop("genre_ids"))
        if "diretores" in changes:
            directors = await _get_or_create_directors(session, changes.pop("diretores"))
            others = [person for person in movie.people if person.tipo_pessoa != "Diretor"]
            movie.people = others + directors
        for field, value in changes.items():
            setattr(movie, field, value)
    return await get_movie(session, sk_movie_id)


async def delete_movie(session: AsyncSession, sk_movie_id: str) -> None:
    """Remove o filme; ligações, performance e avaliações dele somem em cascata.

    Pessoas, gêneros e produtoras permanecem. Levanta ``NotFoundError`` se o filme não
    existir.
    """

    async with _transaction(session):
        if not await repository.delete_movie(session, sk_movie_id):
            raise NotFoundError("Filme não encontrado.")


@asynccontextmanager
async def _transaction(session: AsyncSession) -> AsyncIterator[None]:
    """Confirma a transação ao final do bloco ou desfaz tudo se houver erro."""

    try:
        yield
        await session.commit()
    except Exception:
        await session.rollback()
        raise


async def _get_movie_or_404(session: AsyncSession, sk_movie_id: str) -> DimMovie:
    movie = await repository.get_movie(session, sk_movie_id)
    if movie is None:
        raise NotFoundError("Filme não encontrado.")
    return movie


def _generate_id_filme() -> str:
    """Gera o ``id_filme`` de um filme cadastrado pela aplicação."""

    return f"app-{uuid4().hex[:12]}"


def _normalize_names(names: list[str]) -> list[str]:
    """Remove espaços nas pontas, nomes vazios e repetidos, mantendo a ordem."""

    return list(dict.fromkeys(name.strip() for name in names if name.strip()))


async def _resolve_genres(session: AsyncSession, sk_genre_ids: list[str]) -> list[DimGenre]:
    """Busca os gêneros pelos ids, na ordem recebida; falha se algum não existir."""

    ids = list(dict.fromkeys(sk_genre_ids))
    found = {genre.sk_genre_id: genre for genre in await repository.get_genres_by_ids(session, ids)}
    missing = [genre_id for genre_id in ids if genre_id not in found]
    if missing:
        raise InvalidReferenceError(f"Gênero(s) inexistente(s): {', '.join(missing)}.")
    return [found[genre_id] for genre_id in ids]


async def _get_or_create_directors(session: AsyncSession, names: list[str]) -> list[DimPerson]:
    """Reaproveita os diretores já cadastrados pelo par (nome, 'Diretor') e cria os demais."""

    names = _normalize_names(names)
    found = {
        person.nome_pessoa: person
        for person in await repository.get_directors_by_names(session, names)
    }
    created = [
        DimPerson(nome_pessoa=name, tipo_pessoa="Diretor") for name in names if name not in found
    ]
    session.add_all(created)
    found.update((person.nome_pessoa, person) for person in created)
    return [found[name] for name in names]


def _to_detail(movie: DimMovie) -> MovieDetail:
    """Monta o ``MovieDetail`` de um filme carregado por ``repository.get_movie``."""

    people: dict[str, list[str]] = {"Diretor": [], "Roteirista": [], "Ator": []}
    for person in movie.people:
        people[person.tipo_pessoa].append(person.nome_pessoa)

    summary = movie.reviews_summary
    return MovieDetail(
        sk_movie_id=movie.sk_movie_id,
        id_filme=movie.id_filme,
        titulo=movie.titulo,
        data_lancamento=movie.data_lancamento,
        ano_lancamento=movie.ano_lancamento,
        duracao_minutos=movie.duracao_minutos,
        status_filme=movie.status_filme,
        sinopse=movie.sinopse,
        url_poster=movie.url_poster,
        url_backdrop=movie.url_backdrop,
        generos=[genre.nome_genero for genre in movie.genres],
        diretores=sorted(people["Diretor"]),
        roteiristas=sorted(people["Roteirista"]),
        elenco=sorted(people["Ator"]),
        produtoras=[company.nome_produtora for company in movie.companies],
        performance=(
            MoviePerformance.model_validate(movie.performance) if movie.performance else None
        ),
        nota_media=summary.nota_media_usuarios if summary else None,
        qtd_avaliacoes=summary.qtd_avaliacoes_usuarios if summary else 0,
    )
