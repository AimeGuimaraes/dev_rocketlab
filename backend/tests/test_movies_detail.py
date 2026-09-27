import httpx
import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.movies.models import DimPerson, bridge_movie_person
from tests.db_utils import M1, M2, M3

URL = "/api/v1/movies"


async def test_get_movie_detail_complete(client: httpx.AsyncClient) -> None:
    response = await client.get(f"{URL}/{M1}")

    assert response.status_code == 200
    assert response.json() == {
        "sk_movie_id": M1,
        "id_filme": "teste-0001",
        "titulo": "Filme Fictício Um",
        "data_lancamento": "2001-02-03",
        "ano_lancamento": 2001,
        "duracao_minutos": 101,
        "status_filme": "Released",
        "sinopse": "Sinopse inventada, com vírgula.",
        "url_poster": "https://example.com/p1.jpg",
        "url_backdrop": "https://example.com/b1.jpg",
        "generos": ["Drama Teste", "Ficção Teste"],
        "diretores": ["Diretora Inventada"],
        "roteiristas": [],
        "elenco": ["Ator Inventado"],
        "produtoras": ["Estúdio Fictício Alfa"],
        "performance": {
            "orcamento_usd": pytest.approx(1000000.5),
            "receita_usd": pytest.approx(2500000.75),
            "lucro_usd": pytest.approx(1500000.25),
            "orcamento_brl": pytest.approx(5000000.0),
            "receita_brl": pytest.approx(12500000.0),
            "lucro_brl": pytest.approx(7500000.0),
            "popularidade": pytest.approx(12.345),
            "nota_tmdb": pytest.approx(7.5),
            "qtd_tmdb": 2375,
            "nota_imdb": pytest.approx(7.1),
            "qtd_imdb": 1200,
        },
        "nota_media": pytest.approx(7.0),
        "qtd_avaliacoes": 2,
    }


async def test_get_movie_detail_separates_people_by_type(client: httpx.AsyncClient) -> None:
    body = (await client.get(f"{URL}/{M2}")).json()

    assert body["diretores"] == ["Diretora Inventada"]
    assert body["roteiristas"] == ["Roteirista Inventada"]
    assert body["elenco"] == []
    assert body["produtoras"] == ["Produtora Imaginária Beta"]
    assert body["url_backdrop"] is None
    assert body["performance"]["orcamento_usd"] is None
    assert body["performance"]["nota_imdb"] is None
    assert body["performance"]["qtd_tmdb"] == 10
    assert body["nota_media"] == pytest.approx(10.0)
    assert body["qtd_avaliacoes"] == 1


async def test_get_movie_detail_without_relations(client: httpx.AsyncClient) -> None:
    response = await client.get(f"{URL}/{M3}")

    assert response.status_code == 200
    assert response.json() == {
        "sk_movie_id": M3,
        "id_filme": "teste-0003",
        "titulo": "Filme Fictício Três",
        "data_lancamento": None,
        "ano_lancamento": None,
        "duracao_minutos": None,
        "status_filme": "Rumored",
        "sinopse": None,
        "url_poster": None,
        "url_backdrop": None,
        "generos": [],
        "diretores": [],
        "roteiristas": [],
        "elenco": [],
        "produtoras": [],
        "performance": {
            "orcamento_usd": None,
            "receita_usd": None,
            "lucro_usd": 0.0,
            "orcamento_brl": None,
            "receita_brl": None,
            "lucro_brl": 0.0,
            "popularidade": None,
            "nota_tmdb": None,
            "qtd_tmdb": None,
            "nota_imdb": None,
            "qtd_imdb": None,
        },
        "nota_media": None,
        "qtd_avaliacoes": 0,
    }


async def test_get_movie_detail_sorts_people_by_name(
    client: httpx.AsyncClient, engine: AsyncEngine
) -> None:
    async with AsyncSession(engine) as session:
        extras = [
            DimPerson(nome_pessoa="Zeca Inventado", tipo_pessoa="Ator"),
            DimPerson(nome_pessoa="Ana Inventada", tipo_pessoa="Ator"),
        ]
        session.add_all(extras)
        await session.flush()
        await session.execute(
            insert(bridge_movie_person),
            [{"sk_movie_id": M1, "sk_person_id": person.sk_person_id} for person in extras],
        )
        await session.commit()

    body = (await client.get(f"{URL}/{M1}")).json()

    assert body["elenco"] == ["Ana Inventada", "Ator Inventado", "Zeca Inventado"]
    assert body["diretores"] == ["Diretora Inventada"]


async def test_get_movie_detail_not_found(client: httpx.AsyncClient) -> None:
    response = await client.get(f"{URL}/nao-existe")

    assert response.status_code == 404
    assert response.json() == {"detail": "Filme não encontrado.", "errors": None}


async def test_get_movie_detail_uses_few_queries(
    client: httpx.AsyncClient, statements: list[str]
) -> None:
    response = await client.get(f"{URL}/{M1}")

    assert response.status_code == 200
    selects = [sql for sql in statements if sql.lstrip().upper().startswith("SELECT")]
    # filme (com join em performance e dim_reviews) + selectin de gêneros, produtoras e pessoas.
    assert len(selects) <= 4
