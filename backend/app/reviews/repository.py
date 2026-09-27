"""Consultas SQLAlchemy do domínio de avaliações."""

from sqlalchemy import func, select
from sqlalchemy.dialects.sqlite import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.movies.models import DimMovie, DimReview, MovieReview


async def movie_exists(session: AsyncSession, sk_movie_id: str) -> bool:
    """Indica se o filme existe, sem carregar o objeto."""

    stmt = select(DimMovie.sk_movie_id).where(DimMovie.sk_movie_id == sk_movie_id)
    return await session.scalar(stmt) is not None


async def count_reviews(session: AsyncSession, sk_movie_id: str) -> int:
    """Conta as avaliações de um filme."""

    stmt = select(func.count()).where(MovieReview.sk_movie_id == sk_movie_id)
    return await session.scalar(stmt) or 0


async def list_reviews(
    session: AsyncSession, sk_movie_id: str, offset: int, limit: int
) -> list[MovieReview]:
    """Lista as avaliações de um filme, das mais recentes para as mais antigas."""

    stmt = (
        select(MovieReview)
        .where(MovieReview.sk_movie_id == sk_movie_id)
        # O sk_movie_review_id desempata datas iguais, deixando a paginação estável.
        .order_by(MovieReview.created_at.desc(), MovieReview.sk_movie_review_id.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(await session.scalars(stmt))


async def refresh_summary(session: AsyncSession, sk_movie_id: str) -> tuple[int, float | None]:
    """Recalcula o resumo do filme em ``dim_reviews`` a partir de ``movie_reviews``.

    Quantidade e média são sempre recalculadas do zero (nunca de forma incremental). O
    resumo é criado se o filme ainda não tiver um (``INSERT ... ON CONFLICT DO UPDATE`` pela
    unicidade de ``sk_movie_id``). Devolve ``(quantidade, média)``.
    """

    quantidade, media = (
        await session.execute(
            select(func.count(), func.avg(MovieReview.nota)).where(
                MovieReview.sk_movie_id == sk_movie_id
            )
        )
    ).one()
    stmt = insert(DimReview).values(
        sk_movie_id=sk_movie_id, qtd_avaliacoes_usuarios=quantidade, nota_media_usuarios=media
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[DimReview.sk_movie_id],
        set_={
            "qtd_avaliacoes_usuarios": stmt.excluded.qtd_avaliacoes_usuarios,
            "nota_media_usuarios": stmt.excluded.nota_media_usuarios,
        },
    )
    await session.execute(stmt)
    return quantidade, media
