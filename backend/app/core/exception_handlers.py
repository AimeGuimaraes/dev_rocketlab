"""Tratamento global de erros: todas as respostas de erro seguem o formato ``ErrorResponse``."""

import logging
from collections.abc import Sequence
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.common.schemas import ErrorItem, ErrorResponse
from app.core.errors import InvalidReferenceError, NotFoundError

logger = logging.getLogger(__name__)

VALIDATION_DETAIL = "Dados inválidos."
INTERNAL_ERROR_DETAIL = "Erro interno do servidor."

# Textos padrão do Starlette traduzidos; os demais ``detail`` passam como vieram.
_HTTP_DETAILS = {
    "Not Found": "Recurso não encontrado.",
    "Method Not Allowed": "Método não permitido.",
}

# Mensagens em pt-BR por tipo de erro do Pydantic; recebem o ``ctx`` do erro no ``format``.
_VALIDATION_MESSAGES = {
    "missing": "Campo obrigatório.",
    "extra_forbidden": "Campo não permitido.",
    "greater_than_equal": "Deve ser maior ou igual a {ge}.",
    "less_than_equal": "Deve ser menor ou igual a {le}.",
    "greater_than": "Deve ser maior que {gt}.",
    "less_than": "Deve ser menor que {lt}.",
    "string_too_short": "Deve ter pelo menos {min_length} caractere(s).",
    "string_too_long": "Deve ter no máximo {max_length} caractere(s).",
    "string_type": "Deve ser um texto.",
    "int_parsing": "Deve ser um número inteiro.",
    "int_type": "Deve ser um número inteiro.",
    "int_from_float": "Deve ser um número inteiro.",
    "float_parsing": "Deve ser um número.",
    "float_type": "Deve ser um número.",
    "finite_number": "Deve ser um número finito.",
    "date_parsing": "Data inválida (use AAAA-MM-DD).",
    "date_from_datetime_parsing": "Data inválida (use AAAA-MM-DD).",
    "date_type": "Data inválida (use AAAA-MM-DD).",
    "enum": "Valor inválido; use um de: {expected}.",
    "list_type": "Deve ser uma lista.",
    "json_invalid": "JSON inválido.",
    "model_attributes_type": "O corpo deve ser um objeto JSON.",
    "dict_type": "O corpo deve ser um objeto JSON.",
}


def _error_response(
    status_code: int,
    detail: str,
    errors: list[ErrorItem] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body = ErrorResponse(detail=detail, errors=errors)
    return JSONResponse(status_code=status_code, content=body.model_dump(), headers=headers)


def _field_path(error: dict[str, Any]) -> str:
    """Caminho do campo sem a origem (``body``/``query``/``path``), ex.: ``diretores.0``."""

    loc: Sequence[Any] = error.get("loc", ())
    # No JSON malformado o ``loc`` traz a posição do erro no texto, não um campo.
    path = [] if error.get("type") == "json_invalid" else [str(part) for part in loc[1:]]
    if path:
        return ".".join(path)
    # Erro do corpo como um todo (JSON malformado, corpo ausente).
    return str(loc[0]) if loc else "body"


def _format_ctx_value(value: Any) -> Any:
    """Ajusta valores do ``ctx``: ``10.0`` → ``10`` e ``'a' or 'b'`` → ``'a' ou 'b'``."""

    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        return value.replace(" or ", " ou ")
    return value


def _validation_message(error: dict[str, Any]) -> str:
    error_type = error.get("type", "")
    ctx = error.get("ctx") or {}
    if error_type == "value_error" and "error" in ctx:
        return str(ctx["error"])
    template = _VALIDATION_MESSAGES.get(error_type)
    if template is None:
        return str(error.get("msg", VALIDATION_DETAIL))
    try:
        return template.format(**{key: _format_ctx_value(value) for key, value in ctx.items()})
    except (KeyError, IndexError):
        return str(error.get("msg", VALIDATION_DETAIL))


async def _not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return _error_response(404, str(exc))


async def _invalid_reference_handler(request: Request, exc: InvalidReferenceError) -> JSONResponse:
    errors = [ErrorItem(field=exc.field, message=str(exc))] if exc.field else None
    return _error_response(422, str(exc), errors)


async def _validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [
        ErrorItem(field=_field_path(error), message=_validation_message(error))
        for error in exc.errors()
    ]
    return _error_response(422, VALIDATION_DETAIL, errors)


async def _http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detail = _HTTP_DETAILS.get(str(exc.detail), str(exc.detail))
    return _error_response(exc.status_code, detail, headers=exc.headers)


class UnhandledErrorMiddleware:
    """Converte exceções não tratadas em 500 no formato padrão e registra no log.

    Fica dentro do ``CORSMiddleware`` (o handler de ``Exception`` do Starlette roda fora
    dele), para que o 500 também leve os headers de CORS e o navegador enxergue o erro.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def send_wrapper(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            logger.exception("Erro não tratado em %s %s", scope["method"], scope["path"])
            if response_started:
                raise
            response = _error_response(500, INTERNAL_ERROR_DETAIL)
            await response(scope, receive, send)


def register_exception_handlers(app: FastAPI) -> None:
    """Registra os handlers de erro e o middleware de 500.

    Deve ser chamada antes de adicionar o ``CORSMiddleware``, que precisa envolver o
    middleware de 500 (o último middleware adicionado é o mais externo).
    """

    app.add_exception_handler(NotFoundError, _not_found_handler)
    app.add_exception_handler(InvalidReferenceError, _invalid_reference_handler)
    app.add_exception_handler(RequestValidationError, _validation_handler)
    app.add_exception_handler(StarletteHTTPException, _http_exception_handler)
    app.add_middleware(UnhandledErrorMiddleware)
