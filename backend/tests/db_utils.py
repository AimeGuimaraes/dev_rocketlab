"""Utilitários de banco para os testes."""

import os
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import get_settings

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"


def migrate_database(db_path: Path) -> str:
    """Cria o schema de um SQLite de teste rodando as migrações do Alembic até ``head``.

    Devolve a ``DATABASE_URL`` assíncrona do banco criado.
    """

    database_url = f"sqlite+aiosqlite:///{db_path.as_posix()}"
    # Config sem arquivo: evita que o fileConfig do alembic.ini reconfigure o logging.
    config = Config()
    config.set_main_option("script_location", str(MIGRATIONS_DIR))

    # O env.py lê a URL de get_settings(), que é cacheado.
    previous = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = database_url
    get_settings.cache_clear()
    try:
        command.upgrade(config, "head")
    finally:
        if previous is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous
        get_settings.cache_clear()
    return database_url
