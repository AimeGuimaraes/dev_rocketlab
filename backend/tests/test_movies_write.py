from typing import Any

import httpx
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.movies.models import (
    DimCompany,
    DimGenre,
    DimMovie,
    DimPerson,
    DimReview,
    FactMoviePerformance,
    MovieReview,
    bridge_movie_company,
    bridge_movie_genre,
    bridge_movie_person,
)
from tests.db_utils import M1, M2, M3

URL = "/api/v1/movies"

# Ids dos mini-CSVs de seed.
G_FICCAO = "a" + "1".rjust(63, "0")
G_DRAMA = "a" + "2".rjust(63, "0")
P_DIRETORA = "c" + "1".rjust(63, "0")  # "Diretora Inventada" (Diretor de M1 e M2)

FULL_PAYLOAD: dict[str, Any] = {
    "titulo": "  Filme Novo de Teste  ",
    "diretores": ["Diretor Novo", "Diretora Inventada"],
    "ano_lancamento": 2024,
    "genre_ids": [G_DRAMA, G_FICCAO],
    "sinopse": "Uma sinopse de teste.",
    "duracao_minutos": 95,
    "data_lancamento": "2024-05-06",
    "url_poster": "https://example.com/novo.jpg",
    "url_backdrop": "https://example.com/novo-b.jpg",
}


async def _count(engine: AsyncEngine, model_or_table: Any, *where: Any) -> int:
    async with AsyncSession(engine) as session:
        stmt = select(func.count()).select_from(model_or_table)
        if where:
            stmt = stmt.where(*where)
        return await session.scalar(stmt) or 0


async def _create(client: httpx.AsyncClient, **payload: Any) -> dict:
    response = await client.post(URL, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


# --- POST ---------------------------------------------------------------------------------


async def test_create_movie_returns_detail(client: httpx.AsyncClient) -> None:
    body = await _create(client, **FULL_PAYLOAD)

    assert body["id_filme"].startswith("app-")
    assert body["titulo"] == "Filme Novo de Teste"
    assert body["diretores"] == ["Diretor Novo", "Diretora Inventada"]
    assert body["generos"] == ["Drama Teste", "Ficção Teste"]
    assert body["ano_lancamento"] == 2024
    assert body["data_lancamento"] == "2024-05-06"
    assert body["duracao_minutos"] == 95
    assert body["sinopse"] == "Uma sinopse de teste."
    assert body["url_poster"] == "https://example.com/novo.jpg"
    assert body["url_backdrop"] == "https://example.com/novo-b.jpg"
    assert body["status_filme"] is None
    assert body["elenco"] == []
    assert body["roteiristas"] == []
    assert body["produtoras"] == []
    assert body["performance"] is None
    assert body["nota_media"] is None
    assert body["qtd_avaliacoes"] == 0

    detail = await client.get(f"{URL}/{body['sk_movie_id']}")
    assert detail.status_code == 200
    assert detail.json() == body


async def test_create_movie_without_optional_fields(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    body = await _create(client, titulo="Só Título")

    assert body["titulo"] == "Só Título"
    for field in ("ano_lancamento", "sinopse", "duracao_minutos", "data_lancamento"):
        assert body[field] is None
    assert body["url_poster"] is None
    assert body["diretores"] == []
    assert body["generos"] == []
    assert body["performance"] is None
    sk = body["sk_movie_id"]
    assert await _count(engine, FactMoviePerformance, FactMoviePerformance.sk_movie_id == sk) == 0
    assert await _count(engine, DimReview, DimReview.sk_movie_id == sk) == 0


async def test_create_movie_generates_unique_id_filme(client: httpx.AsyncClient) -> None:
    first = await _create(client, titulo="A")
    second = await _create(client, titulo="A")

    assert first["id_filme"] != second["id_filme"]


async def test_create_movie_reuses_existing_director(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    people_before = await _count(engine, DimPerson)

    body = await _create(
        client,
        titulo="Com Diretora Existente",
        diretores=["Diretora Inventada", " Diretora Inventada ", "", "   ", "Diretor Novo"],
    )

    assert body["diretores"] == ["Diretor Novo", "Diretora Inventada"]
    # Só "Diretor Novo" foi criado; a diretora existente foi reaproveitada.
    assert await _count(engine, DimPerson) == people_before + 1
    async with AsyncSession(engine) as session:
        linked = set(
            await session.scalars(
                select(bridge_movie_person.c.sk_person_id).where(
                    bridge_movie_person.c.sk_movie_id == body["sk_movie_id"]
                )
            )
        )
        novo = await session.scalar(
            select(DimPerson).where(DimPerson.nome_pessoa == "Diretor Novo")
        )
    assert P_DIRETORA in linked
    assert novo is not None and novo.tipo_pessoa == "Diretor"
    assert novo.sk_person_id in linked


async def test_create_movie_with_same_name_as_actor_creates_director(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    body = await _create(client, titulo="Ator que Dirige", diretores=["Ator Inventado"])

    assert body["diretores"] == ["Ator Inventado"]
    assert body["elenco"] == []
    assert await _count(engine, DimPerson, DimPerson.nome_pessoa == "Ator Inventado") == 2


async def test_create_movie_with_invalid_genre_creates_nothing(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    movies_before = await _count(engine, DimMovie)
    people_before = await _count(engine, DimPerson)

    response = await client.post(
        URL,
        json={"titulo": "Inválido", "diretores": ["Diretor Fantasma"], "genre_ids": [G_DRAMA, "x"]},
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "Gênero(s) inexistente(s): x."}
    assert await _count(engine, DimMovie) == movies_before
    assert await _count(engine, DimPerson) == people_before


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"titulo": ""},
        {"titulo": "   "},
        {"titulo": "x" * 501},
        {"titulo": "Ok", "ano_lancamento": 1799},
        {"titulo": "Ok", "ano_lancamento": 2101},
        {"titulo": "Ok", "duracao_minutos": 0},
        {"titulo": "Ok", "sinopse": "x" * 4001},
        {"titulo": "Ok", "data_lancamento": "não é data"},
        {"titulo": "Ok", "id_filme": "manual-1"},
    ],
)
async def test_create_movie_validation_errors(
    client: httpx.AsyncClient, engine: AsyncEngine, payload: dict
) -> None:
    movies_before = await _count(engine, DimMovie)

    response = await client.post(URL, json=payload)

    assert response.status_code == 422
    assert await _count(engine, DimMovie) == movies_before


async def test_created_movie_appears_in_search(client: httpx.AsyncClient) -> None:
    body = await _create(client, titulo="Zebra Voadora", genre_ids=[G_FICCAO])

    response = await client.get(URL, params={"q": "zebra voa"})

    assert response.status_code == 200
    page = response.json()
    assert page["total"] == 1
    assert page["items"][0]["sk_movie_id"] == body["sk_movie_id"]
    assert page["items"][0]["generos"] == ["Ficção Teste"]
    assert page["items"][0]["qtd_avaliacoes"] == 0


# --- PATCH --------------------------------------------------------------------------------


async def test_patch_changes_only_sent_fields(client: httpx.AsyncClient) -> None:
    before = (await client.get(f"{URL}/{M1}")).json()

    response = await client.patch(f"{URL}/{M1}", json={"sinopse": "Nova sinopse."})

    assert response.status_code == 200
    body = response.json()
    assert body == {**before, "sinopse": "Nova sinopse."}
    assert (await client.get(f"{URL}/{M1}")).json() == body


async def test_patch_null_clears_optional_field(client: httpx.AsyncClient) -> None:
    response = await client.patch(f"{URL}/{M1}", json={"url_backdrop": None, "titulo": " Novo "})

    assert response.status_code == 200
    assert response.json()["url_backdrop"] is None
    assert response.json()["titulo"] == "Novo"


async def test_patch_empty_body_changes_nothing(client: httpx.AsyncClient) -> None:
    before = (await client.get(f"{URL}/{M2}")).json()

    response = await client.patch(f"{URL}/{M2}", json={})

    assert response.status_code == 200
    assert response.json() == before


async def test_patch_directors_keeps_cast_and_writers(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    await client.patch(f"{URL}/{M2}", json={"diretores": ["Outra Diretora"]})  # M2 tem roteirista

    response = await client.patch(f"{URL}/{M1}", json={"diretores": ["Outra Diretora", ""]})

    assert response.status_code == 200
    body = response.json()
    assert body["diretores"] == ["Outra Diretora"]
    assert body["elenco"] == ["Ator Inventado"]
    m2 = (await client.get(f"{URL}/{M2}")).json()
    assert m2["diretores"] == ["Outra Diretora"]
    assert m2["roteiristas"] == ["Roteirista Inventada"]
    # A diretora antiga continua cadastrada; "Outra Diretora" foi criada uma vez só.
    assert await _count(engine, DimPerson, DimPerson.sk_person_id == P_DIRETORA) == 1
    assert await _count(engine, DimPerson, DimPerson.nome_pessoa == "Outra Diretora") == 1


async def test_patch_empty_directors_removes_only_directors(client: httpx.AsyncClient) -> None:
    body = (await client.patch(f"{URL}/{M1}", json={"diretores": []})).json()

    assert body["diretores"] == []
    assert body["elenco"] == ["Ator Inventado"]


async def test_patch_genres_replaces_them(client: httpx.AsyncClient) -> None:
    replaced = await client.patch(f"{URL}/{M1}", json={"genre_ids": [G_DRAMA]})
    assert replaced.status_code == 200
    assert replaced.json()["generos"] == ["Drama Teste"]

    added = await client.patch(f"{URL}/{M3}", json={"genre_ids": [G_FICCAO, G_FICCAO]})
    assert added.json()["generos"] == ["Ficção Teste"]

    cleared = await client.patch(f"{URL}/{M1}", json={"genre_ids": []})
    assert cleared.json()["generos"] == []


async def test_patch_invalid_genre_changes_nothing(client: httpx.AsyncClient) -> None:
    before = (await client.get(f"{URL}/{M1}")).json()

    response = await client.patch(
        f"{URL}/{M1}",
        json={"titulo": "Não Deve Mudar", "diretores": ["Alguém"], "genre_ids": ["nao-existe"]},
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "Gênero(s) inexistente(s): nao-existe."}
    assert (await client.get(f"{URL}/{M1}")).json() == before


@pytest.mark.parametrize(
    "payload",
    [
        {"titulo": None},
        {"titulo": "  "},
        {"diretores": None},
        {"genre_ids": None},
        {"ano_lancamento": 1799},
        {"duracao_minutos": 0},
        {"id_filme": "manual"},
    ],
)
async def test_patch_validation_errors(client: httpx.AsyncClient, payload: dict) -> None:
    response = await client.patch(f"{URL}/{M1}", json=payload)

    assert response.status_code == 422


async def test_patch_not_found(client: httpx.AsyncClient) -> None:
    response = await client.patch(f"{URL}/nao-existe", json={"titulo": "X"})

    assert response.status_code == 404
    assert response.json() == {"detail": "Filme não encontrado."}


# --- DELETE -------------------------------------------------------------------------------


async def test_delete_movie_then_get_returns_404(client: httpx.AsyncClient) -> None:
    created = await _create(client, **FULL_PAYLOAD)
    url = f"{URL}/{created['sk_movie_id']}"

    response = await client.delete(url)

    assert response.status_code == 204
    assert response.content == b""
    assert (await client.get(url)).status_code == 404


async def test_delete_movie_cascades_but_keeps_dimensions(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    by_movie = {
        MovieReview: MovieReview.sk_movie_id,
        DimReview: DimReview.sk_movie_id,
        FactMoviePerformance: FactMoviePerformance.sk_movie_id,
        bridge_movie_genre: bridge_movie_genre.c.sk_movie_id,
        bridge_movie_company: bridge_movie_company.c.sk_movie_id,
        bridge_movie_person: bridge_movie_person.c.sk_movie_id,
    }
    for table, column in by_movie.items():
        assert await _count(engine, table, column == M1) > 0, table
    dimensions = {table: await _count(engine, table) for table in (DimPerson, DimGenre, DimCompany)}
    other_reviews = await _count(engine, MovieReview, MovieReview.sk_movie_id != M1)

    response = await client.delete(f"{URL}/{M1}")

    assert response.status_code == 204
    assert await _count(engine, DimMovie, DimMovie.sk_movie_id == M1) == 0
    for table, column in by_movie.items():
        assert await _count(engine, table, column == M1) == 0, table
    for table, total in dimensions.items():
        assert await _count(engine, table) == total, table
    assert await _count(engine, MovieReview) == other_reviews
    # Os outros filmes continuam com seus vínculos.
    assert (await client.get(f"{URL}/{M2}")).json()["diretores"] == ["Diretora Inventada"]


async def test_delete_not_found(client: httpx.AsyncClient) -> None:
    response = await client.delete(f"{URL}/nao-existe")

    assert response.status_code == 404
    assert response.json() == {"detail": "Filme não encontrado."}
