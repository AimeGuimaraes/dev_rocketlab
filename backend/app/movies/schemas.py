"""Schemas Pydantic de entrada e saída do domínio de filmes."""

from dataclasses import dataclass
from datetime import date
from enum import StrEnum

from pydantic import BaseModel, ConfigDict

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


class MoviePerformance(BaseModel):
    """Métricas financeiras e de engajamento do filme, como estão no banco.

    Os valores monetários saem como número (e não como string, que é o padrão do Pydantic
    para ``Decimal``), o que simplifica o consumo pelo front.
    """

    model_config = ConfigDict(from_attributes=True)

    orcamento_usd: float | None
    receita_usd: float | None
    lucro_usd: float
    orcamento_brl: float | None
    receita_brl: float | None
    lucro_brl: float
    popularidade: float | None
    nota_tmdb: float | None
    qtd_tmdb: int | None
    nota_imdb: float | None
    qtd_imdb: int | None


class MovieDetail(BaseModel):
    """Filme completo para a página de detalhe (sem as avaliações individuais)."""

    sk_movie_id: str
    id_filme: str
    titulo: str
    data_lancamento: date | None
    ano_lancamento: int | None
    duracao_minutos: int | None
    status_filme: str | None
    sinopse: str | None
    url_poster: str | None
    url_backdrop: str | None
    generos: list[str]
    diretores: list[str]
    roteiristas: list[str]
    elenco: list[str]
    produtoras: list[str]
    performance: MoviePerformance | None
    nota_media: float | None
    qtd_avaliacoes: int
