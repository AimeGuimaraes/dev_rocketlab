from datetime import UTC, datetime
from math import ceil
from typing import Annotated, Any, Generic, Self, TypeVar

from pydantic import AfterValidator, BaseModel, ConfigDict

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Resposta paginada padrão da API."""

    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int

    @classmethod
    def create(cls, items: list[T], total: int, page: int, page_size: int) -> Self:
        """Monta a página calculando a quantidade total de páginas."""

        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=ceil(total / page_size),
        )


def _assume_utc(value: datetime) -> datetime:
    """Trata datetimes sem fuso como UTC (é como o SQLite grava) e converte os demais."""

    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


# Serializado com fuso explícito, ex.: "2026-09-26T22:01:47Z".
UtcDatetime = Annotated[datetime, AfterValidator(_assume_utc)]


class ErrorItem(BaseModel):
    """Erro associado a um campo da requisição."""

    field: str
    message: str


class ErrorResponse(BaseModel):
    """Formato único das respostas de erro da API."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "detail": "Dados inválidos.",
                    "errors": [{"field": "nota", "message": "Deve ser menor ou igual a 10."}],
                },
                {"detail": "Filme não encontrado.", "errors": None},
            ]
        }
    )

    detail: str
    errors: list[ErrorItem] | None = None


def not_found_response(description: str) -> dict[int | str, dict[str, Any]]:
    """Documentação OpenAPI da resposta 404 no formato ``ErrorResponse``."""

    return {404: {"model": ErrorResponse, "description": description}}


def validation_response(description: str = "Dados inválidos") -> dict[int | str, dict[str, Any]]:
    """Documentação OpenAPI da resposta 422 no formato ``ErrorResponse``."""

    return {422: {"model": ErrorResponse, "description": description}}
