"""Consultas SQLAlchemy do domínio de gêneros."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.movies.models import DimGenre


async def list_genres(session: AsyncSession) -> Sequence[DimGenre]:
    """Lista todos os gêneros ordenados por nome."""

    result = await session.scalars(select(DimGenre).order_by(DimGenre.nome_genero))
    return result.all()
