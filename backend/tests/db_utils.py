"""Utilitários de banco para os testes."""

import os
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import get_settings

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"
FIXTURES_DIR = Path(__file__).parent / "fixtures" / "seed"

# sk_movie_id dos filmes dos mini-CSVs de seed.
M1 = "d" + "1".rjust(63, "0")  # "Filme Fictício Um": 2 gêneros, 2 avaliações (média 7)
M2 = "d" + "2".rjust(63, "0")  # "Filme Fictício Dois": 1 gênero, 1 avaliação (média 10)
M3 = "d" + "3".rjust(63, "0")  # "Filme Fictício Três": sem gêneros nem avaliações


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
