"""Regras de negócio do domínio de avaliações."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page
from app.common.transaction import transaction
from app.core.errors import NotFoundError
from app.movies.models import MovieReview
from app.reviews import repository
from app.reviews.schemas import ReviewCreate, ReviewCreated, ReviewRead


async def list_reviews(
    session: AsyncSession, sk_movie_id: str, page: int, page_size: int
) -> Page[ReviewRead]:
    """Devolve uma página das avaliações do filme, das mais recentes para as mais antigas.

    Levanta ``NotFoundError`` se o filme não existir.
    """

    await _ensure_movie_exists(session, sk_movie_id)
    total = await repository.count_reviews(session, sk_movie_id)
    reviews = await repository.list_reviews(
        session, sk_movie_id, offset=(page - 1) * page_size, limit=page_size
    )
    items = [ReviewRead.model_validate(review) for review in reviews]
    return Page[ReviewRead].create(items, total=total, page=page, page_size=page_size)


async def create_review(
    session: AsyncSession, sk_movie_id: str, data: ReviewCreate
) -> ReviewCreated:
    """Grava a avaliação e recalcula o resumo do filme na mesma transação.

    Levanta ``NotFoundError`` se o filme não existir.
    """

    async with transaction(session):
        await _ensure_movie_exists(session, sk_movie_id)
        review = MovieReview(sk_movie_id=sk_movie_id, **data.model_dump())
        session.add(review)
        await session.flush()
        # Carrega o created_at gerado pelo banco (server_default); no async não há lazy load.
        await session.refresh(review)
        quantidade, media = await repository.refresh_summary(session, sk_movie_id)
    return ReviewCreated(
        avaliacao=ReviewRead.model_validate(review), nota_media=media, qtd_avaliacoes=quantidade
    )


async def _ensure_movie_exists(session: AsyncSession, sk_movie_id: str) -> None:
    if not await repository.movie_exists(session, sk_movie_id):
        raise NotFoundError("Filme não encontrado.")
