from math import ceil
from typing import Generic, Self, TypeVar

from pydantic import BaseModel

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
