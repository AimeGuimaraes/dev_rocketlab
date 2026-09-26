"""Regras de negócio do domínio de filmes."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page
from app.movies import repository
from app.movies.schemas import MovieListItem


async def list_movies(session: AsyncSession, page: int, page_size: int) -> Page[MovieListItem]:
    """Devolve uma página do catálogo ordenado por título."""

    total = await repository.count_movies(session)
    rows = await repository.list_movies(session, offset=(page - 1) * page_size, limit=page_size)
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
