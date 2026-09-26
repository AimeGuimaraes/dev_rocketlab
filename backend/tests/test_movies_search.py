import httpx
import pytest

from tests.db_utils import M1, M2, M3

URL = "/api/v1/movies"

# sk_genre_id dos gêneros dos mini-CSVs de seed.
G_FICCAO = "a" + "1".rjust(63, "0")  # só M1
G_DRAMA = "a" + "2".rjust(63, "0")  # M1 e M2


async def _get(client: httpx.AsyncClient, **params: object) -> dict:
    response = await client.get(URL, params=params)
    assert response.status_code == 200
    return response.json()


def _ids(body: dict) -> list[str]:
    return [item["sk_movie_id"] for item in body["items"]]


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("dois", [M2]),
        ("DOIS", [M2]),
        ("fictício dois", [M2]),
        ("iLmE fIc", [M1, M2, M3]),
        ("um", [M1]),
        ("  dois  ", [M2]),
    ],
)
async def test_search_by_partial_title_ignores_case(
    client: httpx.AsyncClient, q: str, expected: list[str]
) -> None:
    body = await _get(client, q=q)

    assert _ids(body) == expected
    assert body["total"] == len(expected)


async def test_search_without_results(client: httpx.AsyncClient) -> None:
    body = await _get(client, q="inexistente")

    assert body["items"] == []
    assert (body["total"], body["pages"]) == (0, 0)


@pytest.mark.parametrize("q", ["%", "_", "Filme_Fict", "\\"])
async def test_search_escapes_like_wildcards(client: httpx.AsyncClient, q: str) -> None:
    body = await _get(client, q=q)

    assert body["items"] == []
    assert body["total"] == 0


async def test_blank_search_is_ignored(client: httpx.AsyncClient) -> None:
    assert (await _get(client, q="   "))["total"] == 3


@pytest.mark.parametrize(
    ("genre_id", "expected"),
    [(G_FICCAO, [M1]), (G_DRAMA, [M1, M2]), ("inexistente", [])],
)
async def test_filter_by_genre(
    client: httpx.AsyncClient, genre_id: str, expected: list[str]
) -> None:
    body = await _get(client, genre_id=genre_id)

    assert _ids(body) == expected
    assert body["total"] == len(expected)


@pytest.mark.parametrize(("year", "expected"), [(2010, [M2]), (2001, [M1]), (1999, [])])
async def test_filter_by_year(client: httpx.AsyncClient, year: int, expected: list[str]) -> None:
    body = await _get(client, year=year)

    assert _ids(body) == expected
    assert body["total"] == len(expected)


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"genre_id": G_DRAMA, "year": 2001}, [M1]),
        ({"genre_id": G_DRAMA, "q": "dois"}, [M2]),
        ({"genre_id": G_FICCAO, "q": "dois"}, []),
        ({"genre_id": G_DRAMA, "year": 2010, "q": "fictício"}, [M2]),
        ({"genre_id": G_FICCAO, "year": 2010}, []),
    ],
)
async def test_filters_combine(
    client: httpx.AsyncClient, params: dict[str, object], expected: list[str]
) -> None:
    body = await _get(client, **params)

    assert _ids(body) == expected
    assert body["total"] == len(expected)


async def test_total_and_pages_respect_filters(client: httpx.AsyncClient) -> None:
    first = await _get(client, genre_id=G_DRAMA, page_size=1, sort="titulo")
    second = await _get(client, genre_id=G_DRAMA, page_size=1, page=2, sort="titulo")

    assert (first["total"], first["pages"], _ids(first)) == (2, 2, [M2])
    assert (second["total"], second["pages"], _ids(second)) == (2, 2, [M1])


async def test_default_sort_is_popularity_desc_with_nulls_last(
    client: httpx.AsyncClient,
) -> None:
    # Popularidade: M1=12.345, M2=3.2, M3=nula.
    assert _ids(await _get(client)) == [M1, M2, M3]


@pytest.mark.parametrize(
    ("sort", "order", "expected"),
    [
        # Popularidade: M1=12.345, M2=3.2, M3=nula.
        ("popularidade", None, [M1, M2, M3]),
        ("popularidade", "desc", [M1, M2, M3]),
        ("popularidade", "asc", [M2, M1, M3]),
        # Títulos: Dois (M2) < Três (M3) < Um (M1).
        ("titulo", None, [M2, M3, M1]),
        ("titulo", "asc", [M2, M3, M1]),
        ("titulo", "desc", [M1, M3, M2]),
        # Anos: M1=2001, M2=2010, M3=nulo.
        ("ano_lancamento", None, [M2, M1, M3]),
        ("ano_lancamento", "desc", [M2, M1, M3]),
        ("ano_lancamento", "asc", [M1, M2, M3]),
        # Notas médias: M1=7, M2=10, M3 sem avaliações.
        ("nota_media", None, [M2, M1, M3]),
        ("nota_media", "desc", [M2, M1, M3]),
        ("nota_media", "asc", [M1, M2, M3]),
    ],
)
async def test_sort(
    client: httpx.AsyncClient, sort: str, order: str | None, expected: list[str]
) -> None:
    params: dict[str, object] = {"sort": sort}
    if order is not None:
        params["order"] = order

    assert _ids(await _get(client, **params)) == expected


@pytest.mark.parametrize("order", ["asc", "desc"])
@pytest.mark.parametrize("sort", ["popularidade", "ano_lancamento", "nota_media"])
async def test_sort_puts_nulls_last(client: httpx.AsyncClient, sort: str, order: str) -> None:
    # M3 não tem popularidade, ano nem avaliações.
    assert _ids(await _get(client, sort=sort, order=order))[-1] == M3


@pytest.mark.parametrize(
    "params",
    [
        {"sort": "foo"},
        {"sort": "TITULO"},
        {"order": "up"},
        {"year": "abc"},
        {"q": "x" * 201},
    ],
)
async def test_invalid_search_params_return_422(
    client: httpx.AsyncClient, params: dict[str, object]
) -> None:
    response = await client.get(URL, params=params)

    assert response.status_code == 422


async def test_filtered_sorted_list_avoids_n_plus_one(
    client: httpx.AsyncClient, statements: list[str]
) -> None:
    params = {"q": "filme", "genre_id": G_DRAMA, "year": 2001, "sort": "nota_media"}
    response = await client.get(URL, params=params)

    assert response.status_code == 200
    selects = [sql for sql in statements if sql.lstrip().upper().startswith("SELECT")]
    # count + página (com joins em dim_reviews e fact) + selectin dos gêneros.
    assert len(selects) == 3
