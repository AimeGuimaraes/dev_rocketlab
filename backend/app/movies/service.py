"""Regras de negócio do domínio de filmes."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page
from app.core.errors import NotFoundError
from app.movies import repository
from app.movies.schemas import (
    DEFAULT_ORDER,
    MovieDetail,
    MovieFilters,
    MovieListItem,
    MoviePerformance,
    MovieSort,
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

    movie = await repository.get_movie(session, sk_movie_id)
    if movie is None:
        raise NotFoundError("Filme não encontrado.")

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
