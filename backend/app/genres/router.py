"""Endpoints HTTP do domínio de gêneros."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.genres import service
from app.genres.schemas import GenreRead

router = APIRouter()


@router.get("", response_model=list[GenreRead], summary="Lista de gêneros")
async def list_genres(session: Annotated[AsyncSession, Depends(get_db)]) -> list[GenreRead]:
    """Lista todos os gêneros em ordem alfabética."""

    return await service.list_genres(session)
