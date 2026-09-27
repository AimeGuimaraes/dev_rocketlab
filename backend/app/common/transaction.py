"""Controle de transação compartilhado entre os services."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession


@asynccontextmanager
async def transaction(session: AsyncSession) -> AsyncIterator[None]:
    """Confirma a transação ao final do bloco ou desfaz tudo se houver erro."""

    try:
        yield
        await session.commit()
    except Exception:
        await session.rollback()
        raise
