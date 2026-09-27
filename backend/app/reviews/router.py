"""Endpoints HTTP do domínio de avaliações (aninhados em filmes)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page
from app.core.errors import NotFoundError
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


@router.get(
    "/{sk_movie_id}/reviews",
    response_model=Page[ReviewRead],
    summary="Avaliações do filme (mais recentes primeiro)",
    responses={404: {"description": "Filme não encontrado"}},
)
async def list_reviews(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
    page: Annotated[int, Query(ge=1, description="Página (começa em 1)")] = 1,
    page_size: Annotated[
        int, Query(ge=1, le=MAX_PAGE_SIZE, description="Itens por página")
    ] = DEFAULT_PAGE_SIZE,
) -> Page[ReviewRead]:
    try:
        return await service.list_reviews(session, sk_movie_id, page=page, page_size=page_size)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "/{sk_movie_id}/reviews",
    response_model=ReviewCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Avaliar filme",
    responses={
        404: {"description": "Filme não encontrado"},
        422: {"description": "Dados inválidos"},
    },
)
async def create_review(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
    data: ReviewCreate,
) -> ReviewCreated:
    try:
        return await service.create_review(session, sk_movie_id, data)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
