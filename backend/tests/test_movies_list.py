from collections.abc import Iterator

import httpx
import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine

from tests.db_utils import M1, M2, M3

URL = "/api/v1/movies"


async def test_list_movies_default_page_sorted_by_title(client: httpx.AsyncClient) -> None:
    response = await client.get(URL)

    assert response.status_code == 200
    body = response.json()
    assert {key: body[key] for key in ("total", "page", "page_size", "pages")} == {
        "total": 3,
        "page": 1,
        "page_size": 20,
        "pages": 1,
    }
    assert [item["titulo"] for item in body["items"]] == [
        "Filme Fictício Dois",
        "Filme Fictício Três",
        "Filme Fictício Um",
    ]


async def test_list_movies_paginates(client: httpx.AsyncClient) -> None:
    first = (await client.get(URL, params={"page": 1, "page_size": 2})).json()
    last = (await client.get(URL, params={"page": 2, "page_size": 2})).json()

    assert (first["total"], first["pages"], first["page_size"]) == (3, 2, 2)
    assert [item["sk_movie_id"] for item in first["items"]] == [M2, M3]
    assert (last["total"], last["pages"], last["page"]) == (3, 2, 2)
    assert [item["sk_movie_id"] for item in last["items"]] == [M1]


async def test_list_movies_page_past_the_end_is_empty(client: httpx.AsyncClient) -> None:
    response = await client.get(URL, params={"page": 3, "page_size": 2})

    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert (body["total"], body["pages"], body["page"]) == (3, 2, 3)


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page": -1},
        {"page": "abc"},
        {"page_size": 0},
        {"page_size": 101},
    ],
)
async def test_list_movies_rejects_invalid_limits(
    client: httpx.AsyncClient, params: dict[str, object]
) -> None:
    response = await client.get(URL, params=params)

    assert response.status_code == 422


async def test_list_movies_accepts_max_page_size(client: httpx.AsyncClient) -> None:
    response = await client.get(URL, params={"page_size": 100})

    assert response.status_code == 200
    assert response.json()["page_size"] == 100


async def test_list_movies_item_with_reviews(client: httpx.AsyncClient) -> None:
    items = {item["sk_movie_id"]: item for item in (await client.get(URL)).json()["items"]}

    movie = items[M1]
    assert movie == {
        "sk_movie_id": M1,
        "titulo": "Filme Fictício Um",
        "ano_lancamento": 2001,
        "url_poster": "https://example.com/p1.jpg",
        "generos": ["Drama Teste", "Ficção Teste"],
        "nota_media": pytest.approx(7.0),
        "qtd_avaliacoes": 2,
    }
    assert items[M2]["nota_media"] == pytest.approx(10.0)
    assert items[M2]["qtd_avaliacoes"] == 1


async def test_list_movies_item_without_reviews(client: httpx.AsyncClient) -> None:
    items = {item["sk_movie_id"]: item for item in (await client.get(URL)).json()["items"]}

    movie = items[M3]
    assert movie["nota_media"] is None
    assert movie["qtd_avaliacoes"] == 0
    assert movie["generos"] == []
    assert movie["ano_lancamento"] is None
    assert movie["url_poster"] is None


@pytest.fixture
def statements(engine: AsyncEngine) -> Iterator[list[str]]:
    """Registra os comandos SQL executados no banco de teste."""

    executed: list[str] = []

    def _record(conn: object, cursor: object, statement: str, *args: object) -> None:
        executed.append(statement)

    event.listen(engine.sync_engine, "before_cursor_execute", _record)
    yield executed
    event.remove(engine.sync_engine, "before_cursor_execute", _record)


async def test_list_movies_avoids_n_plus_one(
    client: httpx.AsyncClient, statements: list[str]
) -> None:
    response = await client.get(URL)

    assert response.status_code == 200
    selects = [sql for sql in statements if sql.lstrip().upper().startswith("SELECT")]
    # count + página (com join em dim_reviews) + selectin dos gêneros.
    assert len(selects) == 3
