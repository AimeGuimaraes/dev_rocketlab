"""Schemas Pydantic de entrada e saída do domínio de filmes."""

from dataclasses import dataclass
from enum import StrEnum

from pydantic import BaseModel

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
MAX_QUERY_LENGTH = 200


class MovieSort(StrEnum):
    """Campos aceitos para ordenar o catálogo."""

    popularidade = "popularidade"
    titulo = "titulo"
    ano_lancamento = "ano_lancamento"
    nota_media = "nota_media"


class SortOrder(StrEnum):
    """Direção da ordenação."""

    asc = "asc"
    desc = "desc"


# Direção usada quando o cliente não informa ``order``.
DEFAULT_ORDER: dict[MovieSort, SortOrder] = {
    MovieSort.popularidade: SortOrder.desc,
    MovieSort.titulo: SortOrder.asc,
    MovieSort.ano_lancamento: SortOrder.desc,
    MovieSort.nota_media: SortOrder.desc,
}


@dataclass(frozen=True)
class MovieFilters:
    """Filtros opcionais da listagem; ``None`` significa "sem filtro"."""

    q: str | None = None
    genre_id: str | None = None
    year: int | None = None


class MovieListItem(BaseModel):
    """Filme resumido para a listagem do catálogo."""

    sk_movie_id: str
    titulo: str
    ano_lancamento: int | None
    url_poster: str | None
    generos: list[str]
    nota_media: float | None
    qtd_avaliacoes: int
