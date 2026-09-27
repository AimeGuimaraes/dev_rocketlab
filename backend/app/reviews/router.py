"""Endpoints HTTP do domínio de avaliações (aninhados em filmes)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page, not_found_response, validation_response
from app.db.session import get_db
from app.reviews import service
from app.reviews.schemas import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    ReviewCreate,
    ReviewCreated,
    ReviewRead,
)

router = APIRouter()

_MOVIE_NOT_FOUND = not_found_response("Filme não encontrado")


@router.get(
    "/{sk_movie_id}/reviews",
    response_model=Page[ReviewRead],
    summary="Avaliações do filme (mais recentes primeiro)",
    responses={**_MOVIE_NOT_FOUND, **validation_response("Parâmetros de consulta inválidos")},
)
async def list_reviews(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
    page: Annotated[int, Query(ge=1, description="Página (começa em 1)")] = 1,
    page_size: Annotated[
        int, Query(ge=1, le=MAX_PAGE_SIZE, description="Itens por página")
    ] = DEFAULT_PAGE_SIZE,
) -> Page[ReviewRead]:
    """Lista as avaliações do filme; ``created_at`` sai em UTC (sufixo ``Z``)."""

    return await service.list_reviews(session, sk_movie_id, page=page, page_size=page_size)


@router.post(
    "/{sk_movie_id}/reviews",
    response_model=ReviewCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Avaliar filme",
    responses={**_MOVIE_NOT_FOUND, **validation_response()},
)
async def create_review(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
    data: ReviewCreate,
) -> ReviewCreated:
    """Grava a avaliação (nota de 0 a 10) e devolve a média e a quantidade atualizadas."""

    return await service.create_review(session, sk_movie_id, data)
