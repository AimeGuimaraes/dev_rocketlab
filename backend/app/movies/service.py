"""Regras de negócio do domínio de filmes."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page
from app.movies import repository
from app.movies.schemas import DEFAULT_ORDER, MovieFilters, MovieListItem, MovieSort, SortOrder


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
