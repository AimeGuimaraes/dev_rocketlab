import argparse
import csv
import logging
from collections.abc import Iterator
from datetime import date
from decimal import Decimal
from pathlib import Path
from time import perf_counter
from typing import Any

from sqlalchemy import (
    Connection,
    Date,
    Engine,
    Float,
    Integer,
    Numeric,
    Table,
    create_engine,
    delete,
    event,
    func,
    insert,
    select,
)

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.base import Base
from app.movies import models
from app.movies.models import generate_surrogate_key

logger = logging.getLogger("app.cli.seed")

BATCH_SIZE = 5_000
DEFAULT_DATA_DIR = Path(__file__).resolve().parents[2] / "data"

# Ordem de carga respeitando as FKs: (arquivo CSV, tabela).
LOAD_ORDER: list[tuple[str, str]] = [
    ("dim_genres.csv", "dim_genres"),
    ("dim_companies.csv", "dim_companies"),
    ("dim_people.csv", "dim_people"),
    ("dim_movies.csv", "dim_movies"),
    ("fact_movies_performance.csv", "fact_movies_performance"),
    ("bridge_movie_genre.csv", "bridge_movie_genre"),
    ("bridge_movie_company.csv", "bridge_movie_company"),
    ("bridge_movie_person.csv", "bridge_movie_person"),
    ("movies_reviews.csv", "movie_reviews"),
]


def create_seed_engine(database_url: str) -> Engine:
    """Cria um engine síncrono (sem echo) com chaves estrangeiras ativas."""

    engine = create_engine(database_url.replace("+aiosqlite", ""))

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection: Any, connection_record: object) -> None:
        del connection_record
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def convert_value(value: str, column_type: object) -> Any:
    """Converte o texto do CSV para o tipo da coluna; campo vazio vira ``None``."""

    if value == "":
        return None
    if isinstance(column_type, Date):
        return date.fromisoformat(value)
    if isinstance(column_type, Integer):
        # As colunas inteiras da fact vêm como float ("2375.0").
        return int(float(value))
    # Float herda de Numeric, então precisa ser testado antes.
    if isinstance(column_type, Float):
        return float(value)
    if isinstance(column_type, Numeric):
        return Decimal(value)
    return value


def read_batches(path: Path, table: Table) -> Iterator[list[dict[str, Any]]]:
    """Lê o CSV em streaming e devolve lotes de linhas já convertidas."""

    with path.open(encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)
        types = {name: table.columns[name].type for name in reader.fieldnames or []}
        batch: list[dict[str, Any]] = []
        for row in reader:
            batch.append({name: convert_value(row[name], types[name]) for name in types})
            if len(batch) >= BATCH_SIZE:
                yield batch
                batch = []
        if batch:
            yield batch


def load_table(conn: Connection, path: Path, table: Table) -> int:
    """Insere o conteúdo de um CSV na tabela e devolve a quantidade de linhas."""

    total = 0
    for batch in read_batches(path, table):
        conn.execute(insert(table), batch)
        total += len(batch)
    return total


def rebuild_dim_reviews(conn: Connection) -> int:
    """Recalcula ``dim_reviews`` (quantidade e média) a partir de ``movie_reviews``."""

    review = models.MovieReview
    conn.execute(delete(models.DimReview))
    rows = conn.execute(
        select(review.sk_movie_id, func.count(), func.avg(review.nota)).group_by(review.sk_movie_id)
    )
    summaries = [
        {
            "sk_review_id": generate_surrogate_key(),
            "sk_movie_id": sk_movie_id,
            "qtd_avaliacoes_usuarios": quantidade,
            "nota_media_usuarios": media,
        }
        for sk_movie_id, quantidade, media in rows
    ]
    for start in range(0, len(summaries), BATCH_SIZE):
        conn.execute(insert(models.DimReview), summaries[start : start + BATCH_SIZE])
    return len(summaries)


def clear_tables(conn: Connection) -> None:
    """Apaga os dados de todas as tabelas do seed, na ordem inversa das FKs."""

    conn.execute(delete(models.DimReview))
    for _, table_name in reversed(LOAD_ORDER):
        conn.execute(delete(Base.metadata.tables[table_name]))


def seed(engine: Engine, data_dir: Path, reset: bool = False) -> dict[str, int] | None:
    """Carrega os CSVs de ``data_dir``.

    Devolve a contagem por tabela, ou ``None`` se o banco já tinha dados e ``reset``
    não foi pedido.
    """

    missing = [name for name, _ in LOAD_ORDER if not (data_dir / name).is_file()]
    if missing:
        raise FileNotFoundError(f"CSVs ausentes em {data_dir}: {', '.join(missing)}")

    counts: dict[str, int] = {}
    with engine.begin() as conn:
        has_data = conn.execute(select(models.DimMovie.sk_movie_id).limit(1)).first()
        if has_data and not reset:
            logger.warning("O banco já tem dados; nada foi carregado. Use --reset para recarregar.")
            return None
        if reset:
            logger.info("Limpando as tabelas (--reset)...")
            clear_tables(conn)

        for file_name, table_name in LOAD_ORDER:
            table = Base.metadata.tables[table_name]
            counts[table_name] = load_table(conn, data_dir / file_name, table)
            logger.info("%s: %d linhas", table_name, counts[table_name])

        counts["dim_reviews"] = rebuild_dim_reviews(conn)
        logger.info("dim_reviews: %d linhas (recalculado)", counts["dim_reviews"])
    return counts


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Carrega os CSVs de seed no banco.")
    parser.add_argument(
        "--reset", action="store_true", help="apaga os dados existentes antes de carregar"
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help=f"pasta com os CSVs (padrão: {DEFAULT_DATA_DIR})",
    )
    args = parser.parse_args(argv)

    configure_logging()
    engine = create_seed_engine(get_settings().database_url)
    start = perf_counter()
    try:
        counts = seed(engine, args.data_dir, reset=args.reset)
    finally:
        engine.dispose()
    if counts is not None:
        logger.info(
            "Seed concluído: %d linhas em %.1fs", sum(counts.values()), perf_counter() - start
        )


if __name__ == "__main__":
    main()
