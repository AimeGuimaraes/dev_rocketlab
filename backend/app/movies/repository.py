"""Consultas SQLAlchemy do domínio de filmes."""

from typing import Any

from sqlalchemy import Select, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.movies.models import DimMovie, DimReview, FactMoviePerformance, bridge_movie_genre
from app.movies.schemas import MovieFilters, MovieSort, SortOrder

_SORT_COLUMNS = {
    MovieSort.popularidade: FactMoviePerformance.popularidade,
    MovieSort.titulo: DimMovie.titulo,
    MovieSort.ano_lancamento: DimMovie.ano_lancamento,
    MovieSort.nota_media: DimReview.nota_media_usuarios,
}


def _escape_like(value: str) -> str:
    """Escapa os curingas do LIKE para que sejam buscados literalmente."""

    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _apply_filters(stmt: Select[Any], filters: MovieFilters) -> Select[Any]:
    """Aplica os filtros opcionais sobre uma consulta que parte de ``dim_movies``."""

    if filters.q is not None:
        # No SQLite o ilike vira lower() LIKE lower(), que só ignora a caixa em ASCII.
        stmt = stmt.where(DimMovie.titulo.ilike(f"%{_escape_like(filters.q)}%", escape="\\"))
    if filters.genre_id is not None:
        # EXISTS em vez de JOIN: não duplica linhas, então o count não precisa de DISTINCT.
        stmt = stmt.where(
            exists().where(
                bridge_movie_genre.c.sk_movie_id == DimMovie.sk_movie_id,
                bridge_movie_genre.c.sk_genre_id == filters.genre_id,
            )
        )
    if filters.year is not None:
        stmt = stmt.where(DimMovie.ano_lancamento == filters.year)
    return stmt


async def count_movies(session: AsyncSession, filters: MovieFilters) -> int:
    """Conta os filmes do catálogo que atendem aos filtros."""

    stmt = _apply_filters(select(func.count()).select_from(DimMovie), filters)
    return await session.scalar(stmt) or 0


async def list_movies(
    session: AsyncSession,
    filters: MovieFilters,
    sort: MovieSort,
    order: SortOrder,
    offset: int,
    limit: int,
) -> list[tuple[DimMovie, float | None, int]]:
    """Lista filmes filtrados e ordenados, com gêneros e o resumo de avaliações.

    Devolve tuplas ``(filme, nota média, quantidade de avaliações)``. Os gêneros vêm em uma
    única consulta extra (``selectinload``); o resumo e a popularidade vêm por ``LEFT JOIN``
    (ambos 1:1 com o filme). Valores nulos do campo ordenado ficam sempre por último.
    """

    column = _SORT_COLUMNS[sort]
    direction = column.asc() if order is SortOrder.asc else column.desc()
    stmt = (
        select(
            DimMovie,
            DimReview.nota_media_usuarios,
            func.coalesce(DimReview.qtd_avaliacoes_usuarios, 0),
        )
        .outerjoin(DimReview, DimReview.sk_movie_id == DimMovie.sk_movie_id)
        .outerjoin(FactMoviePerformance, FactMoviePerformance.sk_movie_id == DimMovie.sk_movie_id)
        .options(selectinload(DimMovie.genres))
        # O sk_movie_id desempata valores iguais, deixando a paginação estável.
        .order_by(direction.nulls_last(), DimMovie.sk_movie_id)
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(_apply_filters(stmt, filters))
    return [(movie, media, quantidade) for movie, media, quantidade in result]
