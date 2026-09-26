from collections.abc import Iterator
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import Engine, func, select

from app.cli.seed import create_seed_engine, seed
from app.db.base import Base
from app.movies.models import DimMovie, DimReview, FactMoviePerformance
from tests.db_utils import FIXTURES_DIR, M1, M2, M3, migrate_database

EXPECTED_COUNTS = {
    "dim_genres": 2,
    "dim_companies": 2,
    "dim_people": 3,
    "dim_movies": 3,
    "fact_movies_performance": 3,
    "bridge_movie_genre": 3,
    "bridge_movie_company": 2,
    "bridge_movie_person": 4,
    "movie_reviews": 3,
    "dim_reviews": 2,
}


@pytest.fixture
def engine(tmp_path: Path) -> Iterator[Engine]:
    engine = create_seed_engine(migrate_database(tmp_path / "seed.db"))
    yield engine
    engine.dispose()


def table_counts(engine: Engine) -> dict[str, int]:
    with engine.connect() as conn:
        return {
            name: conn.scalar(select(func.count()).select_from(Base.metadata.tables[name]))
            for name in EXPECTED_COUNTS
        }


def test_seed_loads_every_table(engine: Engine) -> None:
    assert seed(engine, FIXTURES_DIR) == EXPECTED_COUNTS
    assert table_counts(engine) == EXPECTED_COUNTS


def test_seed_converts_basic_types(engine: Engine) -> None:
    seed(engine, FIXTURES_DIR)

    with engine.connect() as conn:
        movie = conn.execute(select(DimMovie).where(DimMovie.sk_movie_id == M1)).one()
        empty = conn.execute(select(DimMovie).where(DimMovie.sk_movie_id == M3)).one()
        fact = conn.execute(
            select(FactMoviePerformance).where(FactMoviePerformance.sk_movie_id == M1)
        ).one()

    assert movie.data_lancamento == date(2001, 2, 3)
    assert movie.ano_lancamento == 2001
    assert movie.sinopse == "Sinopse inventada, com vírgula."
    assert empty.data_lancamento is None
    assert empty.duracao_minutos is None
    assert empty.sinopse is None
    assert fact.orcamento_usd == Decimal("1000000.50")
    assert fact.qtd_tmdb == 2375
    assert isinstance(fact.qtd_tmdb, int)
    assert fact.popularidade == pytest.approx(12.345)


def test_seed_rebuilds_dim_reviews_from_movie_reviews(engine: Engine) -> None:
    seed(engine, FIXTURES_DIR)

    with engine.connect() as conn:
        summaries = {
            row.sk_movie_id: (row.qtd_avaliacoes_usuarios, row.nota_media_usuarios)
            for row in conn.execute(select(DimReview))
        }

    # dim_reviews.csv (com 99 avaliações para M1 e um resumo para M3) é ignorado.
    assert summaries == {M1: (2, pytest.approx(7.0)), M2: (1, pytest.approx(10.0))}


def test_seed_skips_when_database_has_data(engine: Engine) -> None:
    seed(engine, FIXTURES_DIR)

    assert seed(engine, FIXTURES_DIR) is None
    assert table_counts(engine) == EXPECTED_COUNTS


def test_seed_reset_reloads_without_duplicates(engine: Engine) -> None:
    seed(engine, FIXTURES_DIR)

    assert seed(engine, FIXTURES_DIR, reset=True) == EXPECTED_COUNTS
    assert table_counts(engine) == EXPECTED_COUNTS
