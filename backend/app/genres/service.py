"""Regras de negócio do domínio de gêneros."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.genres import repository
from app.genres.schemas import GenreRead


async def list_genres(session: AsyncSession) -> list[GenreRead]:
    """Devolve todos os gêneros ordenados por nome."""

    return [GenreRead.model_validate(genre) for genre in await repository.list_genres(session)]
