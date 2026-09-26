"""Endpoints HTTP do domínio de filmes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page
from app.core.errors import InvalidReferenceError, NotFoundError
from app.db.session import get_db
from app.movies import service
from app.movies.schemas import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    MAX_QUERY_LENGTH,
    MovieCreate,
    MovieDetail,
    MovieFilters,
    MovieListItem,
    MovieSort,
    MovieUpdate,
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


@router.get(
    "/{sk_movie_id}",
    response_model=MovieDetail,
    summary="Detalhe do filme",
    responses={404: {"description": "Filme não encontrado"}},
)
async def get_movie(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
) -> MovieDetail:
    try:
        return await service.get_movie(session, sk_movie_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "",
    response_model=MovieDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar filme",
    responses={422: {"description": "Dados inválidos ou gênero inexistente"}},
)
async def create_movie(
    session: Annotated[AsyncSession, Depends(get_db)],
    data: MovieCreate,
) -> MovieDetail:
    try:
        return await service.create_movie(session, data)
    except InvalidReferenceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.patch(
    "/{sk_movie_id}",
    response_model=MovieDetail,
    summary="Atualizar filme (parcial)",
    responses={
        404: {"description": "Filme não encontrado"},
        422: {"description": "Dados inválidos ou gênero inexistente"},
    },
)
async def update_movie(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
    data: MovieUpdate,
) -> MovieDetail:
    try:
        return await service.update_movie(session, sk_movie_id, data)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InvalidReferenceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.delete(
    "/{sk_movie_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Remover filme",
    responses={404: {"description": "Filme não encontrado"}},
)
async def delete_movie(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
) -> None:
    try:
        await service.delete_movie(session, sk_movie_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
