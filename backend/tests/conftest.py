"""Fixtures compartilhadas: banco SQLite temporário migrado, populado e ligado à API."""

import shutil
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import httpx
import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.cli.seed import create_seed_engine, seed
from app.db.session import enable_sqlite_foreign_keys, get_db
from app.main import app
from tests.db_utils import FIXTURES_DIR, migrate_database


@pytest.fixture(scope="session")
def seeded_template(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Banco-modelo migrado pelo Alembic e populado com os mini-CSVs, criado uma vez."""

    db_path = tmp_path_factory.mktemp("template") / "template.db"
    engine = create_seed_engine(migrate_database(db_path))
    try:
        seed(engine, FIXTURES_DIR)
    finally:
        engine.dispose()
    return db_path


@pytest.fixture
def db_url(seeded_template: Path, tmp_path: Path) -> str:
    """URL de uma cópia do banco-modelo, isolada por teste."""

    db_path = tmp_path / "test.db"
    shutil.copyfile(seeded_template, db_path)
    return f"sqlite+aiosqlite:///{db_path.as_posix()}"


@pytest.fixture
async def engine(db_url: str) -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(db_url)
    enable_sqlite_foreign_keys(engine)
    yield engine
    await engine.dispose()


@pytest.fixture
async def client(engine: AsyncEngine) -> AsyncIterator[httpx.AsyncClient]:
    """Cliente HTTP da API com ``get_db`` apontando para o banco de teste."""

    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def statements(engine: AsyncEngine) -> Iterator[list[str]]:
    """Registra os comandos SQL executados no banco de teste."""

    executed: list[str] = []

    def _record(conn: object, cursor: object, statement: str, *args: object) -> None:
        executed.append(statement)

    event.listen(engine.sync_engine, "before_cursor_execute", _record)
    yield executed
    event.remove(engine.sync_engine, "before_cursor_execute", _record)
