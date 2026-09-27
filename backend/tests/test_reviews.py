from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.movies.models import DimReview, MovieReview
from tests.db_utils import M1, M2, M3

MOVIES_URL = "/api/v1/movies"

VALID: dict[str, Any] = {"nome": "Avaliadora", "nota": 10, "comentario": "Ótimo filme."}

BASE_TIME = datetime(2025, 1, 1, 12, 0, 0)


def _url(sk_movie_id: str) -> str:
    return f"{MOVIES_URL}/{sk_movie_id}/reviews"


def _review_id(n: int) -> str:
    return "b" + str(n).rjust(63, "0")


async def _count_reviews(engine: AsyncEngine, *where: Any) -> int:
    async with AsyncSession(engine) as session:
        stmt = select(func.count()).select_from(MovieReview)
        if where:
            stmt = stmt.where(*where)
        return await session.scalar(stmt) or 0


async def _summary(engine: AsyncEngine, sk_movie_id: str) -> tuple[int, float | None] | None:
    async with AsyncSession(engine) as session:
        row = (
            await session.execute(
                select(DimReview.qtd_avaliacoes_usuarios, DimReview.nota_media_usuarios).where(
                    DimReview.sk_movie_id == sk_movie_id
                )
            )
        ).one_or_none()
    return None if row is None else (row[0], row[1])


async def _insert_reviews(engine: AsyncEngine, sk_movie_id: str, *rows: tuple[int, datetime]):
    """Insere avaliações direto no banco com ``created_at`` controlado."""

    async with AsyncSession(engine) as session:
        session.add_all(
            MovieReview(
                sk_movie_review_id=_review_id(n),
                sk_movie_id=sk_movie_id,
                nome=f"Pessoa {n}",
                nota=5.0,
                comentario=f"Comentário {n}.",
                created_at=created_at,
            )
            for n, created_at in rows
        )
        await session.commit()


async def _post(client: httpx.AsyncClient, sk_movie_id: str, **payload: Any) -> dict:
    response = await client.post(_url(sk_movie_id), json=payload)
    assert response.status_code == 201, response.text
    return response.json()


# --- POST ---------------------------------------------------------------------------------


async def test_create_review_updates_summary_in_detail_and_list(
    client: httpx.AsyncClient,
) -> None:
    body = await _post(client, M1, nome="  Avaliadora  ", nota=10, comentario="  Ótimo filme.  ")

    review = body["avaliacao"]
    assert review["nome"] == "Avaliadora"
    assert review["comentario"] == "Ótimo filme."
    assert review["nota"] == 10.0
    assert review["sk_movie_review_id"]
    assert datetime.fromisoformat(review["created_at"])
    # M1 tinha 8 e 6 (média 7); com o 10, fica média 8 em 3 avaliações.
    assert body["qtd_avaliacoes"] == 3
    assert body["nota_media"] == pytest.approx(8.0)

    detail = (await client.get(f"{MOVIES_URL}/{M1}")).json()
    assert detail["qtd_avaliacoes"] == 3
    assert detail["nota_media"] == pytest.approx(8.0)

    catalog = (await client.get(MOVIES_URL, params={"page_size": 100})).json()
    item = next(item for item in catalog["items"] if item["sk_movie_id"] == M1)
    assert item["qtd_avaliacoes"] == 3
    assert item["nota_media"] == pytest.approx(8.0)

    listed = (await client.get(_url(M1))).json()
    assert listed["total"] == 3
    assert review in listed["items"]


async def test_create_review_recalculates_summary_from_scratch(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    async with AsyncSession(engine) as session:
        await session.execute(
            update(DimReview)
            .where(DimReview.sk_movie_id == M1)
            .values(qtd_avaliacoes_usuarios=99, nota_media_usuarios=1.0)
        )
        await session.commit()

    body = await _post(client, M1, **{**VALID, "nota": 4})

    # Recalculado de movie_reviews (8, 6, 4), e não somado ao resumo adulterado.
    assert body["qtd_avaliacoes"] == 3
    assert body["nota_media"] == pytest.approx(6.0)
    assert await _summary(engine, M1) == (3, pytest.approx(6.0))


async def test_first_review_creates_summary(client: httpx.AsyncClient, engine: AsyncEngine) -> None:
    assert await _summary(engine, M3) is None

    body = await _post(client, M3, **{**VALID, "nota": 7.5})

    assert body["qtd_avaliacoes"] == 1
    assert body["nota_media"] == pytest.approx(7.5)
    assert await _summary(engine, M3) == (1, pytest.approx(7.5))
    async with AsyncSession(engine) as session:
        rows = await session.scalar(
            select(func.count()).select_from(DimReview).where(DimReview.sk_movie_id == M3)
        )
    assert rows == 1
    detail = (await client.get(f"{MOVIES_URL}/{M3}")).json()
    assert detail["qtd_avaliacoes"] == 1
    assert detail["nota_media"] == pytest.approx(7.5)


async def test_create_review_does_not_touch_other_movies(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    await _post(client, M1, **VALID)

    assert await _summary(engine, M2) == (1, pytest.approx(10.0))
    assert await _summary(engine, M3) is None


@pytest.mark.parametrize("nota", [0, 10])
async def test_create_review_accepts_bounds(client: httpx.AsyncClient, nota: int) -> None:
    body = await _post(client, M3, **{**VALID, "nota": nota})

    assert body["avaliacao"]["nota"] == float(nota)


@pytest.mark.parametrize(
    ("nota", "expected"),
    [(7.25, 7.3), (8.04, 8.0), (9.95, 10.0), (7, 7.0), (3.333, 3.3)],
)
async def test_create_review_rounds_nota(
    client: httpx.AsyncClient, engine: AsyncEngine, nota: float, expected: float
) -> None:
    body = await _post(client, M3, **{**VALID, "nota": nota})

    assert body["avaliacao"]["nota"] == expected
    assert body["nota_media"] == pytest.approx(expected)
    async with AsyncSession(engine) as session:
        stored = await session.scalar(
            select(MovieReview.nota).where(
                MovieReview.sk_movie_review_id == body["avaliacao"]["sk_movie_review_id"]
            )
        )
    assert stored == expected


@pytest.mark.parametrize(
    "payload",
    [
        {**VALID, "nota": -1},
        {**VALID, "nota": 10.1},
        {**VALID, "nota": 10.04},
        {**VALID, "nota": "abc"},
        {**VALID, "nota": None},
        {**VALID, "nome": ""},
        {**VALID, "nome": "   "},
        {**VALID, "nome": "x" * 121},
        {**VALID, "comentario": ""},
        {**VALID, "comentario": "   "},
        {**VALID, "comentario": "x" * 4001},
        {"nota": 5, "comentario": "Sem nome."},
        {"nome": "Sem nota", "comentario": "Sem nota."},
        {"nome": "Sem comentário", "nota": 5},
        {},
        {**VALID, "sk_movie_id": M2},
        {**VALID, "created_at": "2020-01-01T00:00:00"},
    ],
)
async def test_create_review_validation_errors(
    client: httpx.AsyncClient, engine: AsyncEngine, payload: dict
) -> None:
    before = await _count_reviews(engine)

    response = await client.post(_url(M1), json=payload)

    assert response.status_code == 422
    assert await _count_reviews(engine) == before
    assert await _summary(engine, M1) == (2, pytest.approx(7.0))


async def test_create_review_movie_not_found(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    before = await _count_reviews(engine)

    response = await client.post(_url("nao-existe"), json=VALID)

    assert response.status_code == 404
    assert response.json() == {"detail": "Filme não encontrado.", "errors": None}
    assert await _count_reviews(engine) == before


# --- GET ----------------------------------------------------------------------------------


async def test_list_reviews_returns_page(client: httpx.AsyncClient) -> None:
    response = await client.get(_url(M1))

    assert response.status_code == 200
    page = response.json()
    assert page["total"] == 2
    assert page["page"] == 1
    assert page["page_size"] == 10
    assert page["pages"] == 1
    assert {item["nota"] for item in page["items"]} == {8.0, 6.0}
    assert set(page["items"][0]) == {
        "sk_movie_review_id",
        "nome",
        "nota",
        "comentario",
        "created_at",
    }


async def test_list_reviews_empty(client: httpx.AsyncClient) -> None:
    page = (await client.get(_url(M3))).json()

    assert page == {"items": [], "total": 0, "page": 1, "page_size": 10, "pages": 0}


async def test_list_reviews_most_recent_first(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    await _insert_reviews(
        engine,
        M3,
        (1, BASE_TIME),
        (2, BASE_TIME + timedelta(days=2)),
        (3, BASE_TIME + timedelta(days=1)),
        # Mesma data: desempate por sk_movie_review_id decrescente.
        (4, BASE_TIME + timedelta(days=1)),
    )

    page = (await client.get(_url(M3))).json()

    ids = [item["sk_movie_review_id"] for item in page["items"]]
    assert ids == [_review_id(2), _review_id(4), _review_id(3), _review_id(1)]


async def test_new_review_comes_first(client: httpx.AsyncClient, engine: AsyncEngine) -> None:
    await _insert_reviews(engine, M3, (1, BASE_TIME))

    body = await _post(client, M3, **VALID)

    page = (await client.get(_url(M3))).json()
    assert page["items"][0] == body["avaliacao"]


async def test_list_reviews_pagination(client: httpx.AsyncClient, engine: AsyncEngine) -> None:
    await _insert_reviews(engine, M3, *((n, BASE_TIME + timedelta(hours=n)) for n in range(1, 6)))

    pages = [
        (await client.get(_url(M3), params={"page": n, "page_size": 2})).json()
        for n in (1, 2, 3, 4)
    ]

    assert [len(page["items"]) for page in pages] == [2, 2, 1, 0]
    assert all(page["total"] == 5 and page["pages"] == 3 for page in pages)
    ids = [item["sk_movie_review_id"] for page in pages for item in page["items"]]
    assert ids == [_review_id(n) for n in (5, 4, 3, 2, 1)]


@pytest.mark.parametrize(
    "params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}, {"page": "x"}]
)
async def test_list_reviews_invalid_params(client: httpx.AsyncClient, params: dict) -> None:
    response = await client.get(_url(M1), params=params)

    assert response.status_code == 422


async def test_list_reviews_movie_not_found(client: httpx.AsyncClient) -> None:
    response = await client.get(_url("nao-existe"))

    assert response.status_code == 404
    assert response.json() == {"detail": "Filme não encontrado.", "errors": None}


async def test_created_review_has_utc_created_at(client: httpx.AsyncClient) -> None:
    body = await _post(client, M1, **VALID)

    created_at = body["avaliacao"]["created_at"]
    assert created_at.endswith("Z")
    assert datetime.fromisoformat(created_at).tzinfo == UTC


async def test_list_reviews_serializes_naive_created_at_as_utc(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    # Como o SQLite grava: UTC sem fuso.
    await _insert_reviews(engine, M3, (1, datetime(2026, 9, 26, 22, 1, 47)))

    page = (await client.get(_url(M3))).json()

    assert page["items"][0]["created_at"] == "2026-09-26T22:01:47Z"


async def test_list_reviews_uses_few_queries(
    client: httpx.AsyncClient, statements: list[str]
) -> None:
    response = await client.get(_url(M1))

    assert response.status_code == 200
    selects = [sql for sql in statements if sql.lstrip().upper().startswith("SELECT")]
    # existência do filme + count + página.
    assert len(selects) == 3
