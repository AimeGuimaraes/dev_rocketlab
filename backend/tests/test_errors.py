"""Formato único de erro da API e documentação dele no OpenAPI."""

import logging
from collections.abc import AsyncIterator

import httpx
import pytest

from app.core.exception_handlers import INTERNAL_ERROR_DETAIL, VALIDATION_DETAIL
from app.main import app, create_app
from tests.db_utils import M1

MOVIES_URL = "/api/v1/movies"
REVIEW: dict = {"nome": "Avaliadora", "nota": 8, "comentario": "Bom."}


def _fields(response: httpx.Response) -> dict[str, str]:
    body = response.json()
    assert body["detail"] == VALIDATION_DETAIL
    return {error["field"]: error["message"] for error in body["errors"]}


# --- Validação (422) ----------------------------------------------------------------------


async def test_body_validation_error_points_to_field(client: httpx.AsyncClient) -> None:
    response = await client.post(f"{MOVIES_URL}/{M1}/reviews", json={**REVIEW, "nota": 11})

    assert response.status_code == 422
    assert _fields(response) == {"nota": "Deve ser menor ou igual a 10."}


async def test_query_validation_error_points_to_param(client: httpx.AsyncClient) -> None:
    response = await client.get(MOVIES_URL, params={"page_size": 0})

    assert response.status_code == 422
    assert _fields(response) == {"page_size": "Deve ser maior ou igual a 1."}


async def test_enum_error_lists_expected_values(client: httpx.AsyncClient) -> None:
    response = await client.get(MOVIES_URL, params={"order": "x"})

    assert response.status_code == 422
    assert _fields(response) == {"order": "Valor inválido; use um de: 'asc' ou 'desc'."}


async def test_missing_and_extra_fields(client: httpx.AsyncClient) -> None:
    response = await client.post(MOVIES_URL, json={"id_filme": "manual-1"})

    assert response.status_code == 422
    assert _fields(response) == {"titulo": "Campo obrigatório.", "id_filme": "Campo não permitido."}


async def test_list_item_error_includes_index(client: httpx.AsyncClient) -> None:
    response = await client.post(MOVIES_URL, json={"titulo": "Ok", "diretores": ["A", 1]})

    assert response.status_code == 422
    assert _fields(response) == {"diretores.1": "Deve ser um texto."}


async def test_explicit_null_on_patch_points_to_field(client: httpx.AsyncClient) -> None:
    response = await client.patch(f"{MOVIES_URL}/{M1}", json={"titulo": None})

    assert response.status_code == 422
    assert _fields(response) == {"titulo": "O campo 'titulo' não pode ser nulo."}


async def test_malformed_json_points_to_body(client: httpx.AsyncClient) -> None:
    response = await client.post(
        f"{MOVIES_URL}/{M1}/reviews",
        content=b'{"nome": ',
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 422
    assert list(_fields(response)) == ["body"]


# --- HTTP (404/405) -----------------------------------------------------------------------


async def test_unknown_route_uses_error_format(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/nao-existe")

    assert response.status_code == 404
    assert response.json() == {"detail": "Recurso não encontrado.", "errors": None}


async def test_method_not_allowed_uses_error_format(client: httpx.AsyncClient) -> None:
    response = await client.put(f"{MOVIES_URL}/{M1}", json={})

    assert response.status_code == 405
    assert response.json() == {"detail": "Método não permitido.", "errors": None}
    assert "allow" in response.headers


# --- Erro inesperado (500) ----------------------------------------------------------------


@pytest.fixture
async def failing_client() -> AsyncIterator[httpx.AsyncClient]:
    """Cliente de um app com uma rota que sempre falha com exceção não tratada."""

    failing_app = create_app()

    @failing_app.get("/boom")
    async def boom() -> None:
        raise RuntimeError("falha simulada")

    transport = httpx.ASGITransport(app=failing_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


async def test_unhandled_error_returns_500_with_cors(
    failing_client: httpx.AsyncClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.ERROR):
        response = await failing_client.get("/boom", headers={"Origin": "http://localhost:5173"})

    assert response.status_code == 500
    assert response.json() == {"detail": INTERNAL_ERROR_DETAIL, "errors": None}
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "falha simulada" in caplog.text


async def test_unhandled_error_without_allowed_origin_has_no_cors(
    failing_client: httpx.AsyncClient,
) -> None:
    response = await failing_client.get("/boom", headers={"Origin": "http://malicioso.example"})

    assert response.status_code == 500
    assert "access-control-allow-origin" not in response.headers


# --- OpenAPI ------------------------------------------------------------------------------


def test_openapi_documents_error_response() -> None:
    schema = app.openapi()
    ref = "#/components/schemas/ErrorResponse"

    assert "ErrorResponse" in schema["components"]["schemas"]
    assert "HTTPValidationError" not in schema["components"]["schemas"]
    documented = 0
    for path in schema["paths"].values():
        for operation in path.values():
            for code in ("404", "422"):
                if code in operation["responses"]:
                    content = operation["responses"][code]["content"]["application/json"]
                    assert content["schema"]["$ref"] == ref
                    documented += 1
    assert documented >= 8
