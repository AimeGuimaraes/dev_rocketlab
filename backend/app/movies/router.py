"""Endpoints HTTP do domínio de filmes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page
from app.db.session import get_db
from app.movies import service
from app.movies.schemas import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    MAX_QUERY_LENGTH,
    MovieFilters,
    MovieListItem,
    MovieSort,
    SortOrder,
)

router = APIRouter()


@router.get("", response_model=Page[MovieListItem], summary="Catálogo paginado")
async def list_movies(
    session: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1, description="Página (começa em 1)")] = 1,
    page_size: Annotated[
        int, Query(ge=1, le=MAX_PAGE_SIZE, description="Itens por página")
    ] = DEFAULT_PAGE_SIZE,
    q: Annotated[
        str | None,
        Query(
            max_length=MAX_QUERY_LENGTH,
            description="Trecho do título (sem diferenciar maiúsculas/minúsculas)",
        ),
    ] = None,
    genre_id: Annotated[str | None, Query(description="sk_genre_id do gênero")] = None,
    year: Annotated[int | None, Query(ge=1800, le=2100, description="Ano de lançamento")] = None,
    sort: Annotated[MovieSort, Query(description="Campo de ordenação")] = MovieSort.popularidade,
    order: Annotated[
        SortOrder | None,
        Query(description="Direção; padrão desc, exceto para titulo (asc)"),
    ] = None,
) -> Page[MovieListItem]:
    filters = MovieFilters(q=q, genre_id=genre_id, year=year)
    return await service.list_movies(
        session, page=page, page_size=page_size, filters=filters, sort=sort, order=order
    )
