"""Endpoints HTTP do domínio de filmes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page
from app.db.session import get_db
from app.movies import service
from app.movies.schemas import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MovieListItem

router = APIRouter()


@router.get("", response_model=Page[MovieListItem], summary="Catálogo paginado")
async def list_movies(
    session: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1, description="Página (começa em 1)")] = 1,
    page_size: Annotated[
        int, Query(ge=1, le=MAX_PAGE_SIZE, description="Itens por página")
    ] = DEFAULT_PAGE_SIZE,
) -> Page[MovieListItem]:
    return await service.list_movies(session, page=page, page_size=page_size)
