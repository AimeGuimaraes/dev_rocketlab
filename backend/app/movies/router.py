"""Endpoints HTTP do domínio de filmes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.schemas import Page, not_found_response, validation_response
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

_MOVIE_NOT_FOUND = not_found_response("Filme não encontrado")
# Rotas só com o id no caminho: o FastAPI documenta um 422 por padrão; aqui no formato da API.
_MOVIE_BY_ID = {**_MOVIE_NOT_FOUND, **validation_response()}
_INVALID_MOVIE_DATA = validation_response("Dados inválidos ou gênero inexistente")


@router.get(
    "",
    response_model=Page[MovieListItem],
    summary="Catálogo paginado",
    responses=validation_response("Parâmetros de consulta inválidos"),
)
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
    """Lista os filmes com busca por título, filtros por gênero e ano, e ordenação."""

    filters = MovieFilters(q=q, genre_id=genre_id, year=year)
    return await service.list_movies(
        session, page=page, page_size=page_size, filters=filters, sort=sort, order=order
    )


@router.get(
    "/{sk_movie_id}",
    response_model=MovieDetail,
    summary="Detalhe do filme",
    responses=_MOVIE_BY_ID,
)
async def get_movie(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
) -> MovieDetail:
    """Devolve o filme com gêneros, pessoas, produtoras, performance e média das avaliações."""

    return await service.get_movie(session, sk_movie_id)


@router.post(
    "",
    response_model=MovieDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar filme",
    responses=_INVALID_MOVIE_DATA,
)
async def create_movie(
    session: Annotated[AsyncSession, Depends(get_db)],
    data: MovieCreate,
) -> MovieDetail:
    """Cadastra um filme; diretores são reaproveitados pelo nome ou criados."""

    return await service.create_movie(session, data)


@router.patch(
    "/{sk_movie_id}",
    response_model=MovieDetail,
    summary="Atualizar filme (parcial)",
    responses={**_MOVIE_NOT_FOUND, **_INVALID_MOVIE_DATA},
)
async def update_movie(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
    data: MovieUpdate,
) -> MovieDetail:
    """Altera só os campos enviados; ``diretores`` e ``genre_ids`` substituem as listas."""

    return await service.update_movie(session, sk_movie_id, data)


@router.delete(
    "/{sk_movie_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Remover filme",
    responses=_MOVIE_BY_ID,
)
async def delete_movie(
    session: Annotated[AsyncSession, Depends(get_db)],
    sk_movie_id: str,
) -> None:
    """Remove o filme junto com suas ligações, performance e avaliações."""

    await service.delete_movie(session, sk_movie_id)
