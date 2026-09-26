"""Consultas SQLAlchemy do domínio de filmes."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.movies.models import DimMovie, DimReview


async def count_movies(session: AsyncSession) -> int:
    """Conta todos os filmes do catálogo."""

    return await session.scalar(select(func.count()).select_from(DimMovie)) or 0


async def list_movies(
    session: AsyncSession, offset: int, limit: int
) -> list[tuple[DimMovie, float | None, int]]:
    """Lista filmes ordenados por título, com gêneros e o resumo de avaliações.

    Devolve tuplas ``(filme, nota média, quantidade de avaliações)``. Os gêneros vêm em uma
    única consulta extra (``selectinload``) e o resumo por ``LEFT JOIN`` com ``dim_reviews``.
    """

    stmt = (
        select(
            DimMovie,
            DimReview.nota_media_usuarios,
            func.coalesce(DimReview.qtd_avaliacoes_usuarios, 0),
        )
        .outerjoin(DimReview, DimReview.sk_movie_id == DimMovie.sk_movie_id)
        .options(selectinload(DimMovie.genres))
        # O sk_movie_id desempata títulos iguais, deixando a paginação estável.
        .order_by(DimMovie.titulo, DimMovie.sk_movie_id)
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return [(movie, media, quantidade) for movie, media, quantidade in result]
