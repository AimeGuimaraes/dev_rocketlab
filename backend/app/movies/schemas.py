"""Schemas Pydantic de entrada e saída do domínio de filmes."""

from dataclasses import dataclass
from datetime import date
from enum import StrEnum
from typing import Annotated, Any, Self

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
MAX_QUERY_LENGTH = 200

Titulo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
# Nomes vazios ou repetidos são descartados pelo service.
NomePessoa = Annotated[str, StringConstraints(max_length=255)]
AnoLancamento = Annotated[int, Field(ge=1800, le=2100)]
DuracaoMinutos = Annotated[int, Field(ge=1)]
Sinopse = Annotated[str, StringConstraints(max_length=4000)]
Url = Annotated[str, StringConstraints(max_length=2048)]


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


class MovieCreate(BaseModel):
    """Dados para cadastrar um filme. O ``id_filme`` é gerado pelo backend."""

    model_config = ConfigDict(extra="forbid")

    titulo: Titulo
    diretores: list[NomePessoa] = Field(default_factory=list, description="Nomes dos diretores")
    ano_lancamento: AnoLancamento | None = None
    genre_ids: list[str] = Field(default_factory=list, description="sk_genre_id dos gêneros")
    sinopse: Sinopse | None = None
    duracao_minutos: DuracaoMinutos | None = None
    data_lancamento: date | None = None
    url_poster: Url | None = None
    url_backdrop: Url | None = None


# Campos do PATCH que não podem ser limpos com ``null`` (listas vazias limpam as listas).
_NON_NULLABLE_UPDATE_FIELDS = ("titulo", "diretores", "genre_ids")


class MovieUpdate(BaseModel):
    """Atualização parcial: só os campos enviados são alterados.

    ``diretores`` substitui apenas os diretores (elenco e roteiristas ficam);
    ``genre_ids`` substitui todos os gêneros.
    """

    model_config = ConfigDict(extra="forbid")

    titulo: Titulo | None = None
    diretores: list[NomePessoa] | None = None
    ano_lancamento: AnoLancamento | None = None
    genre_ids: list[str] | None = None
    sinopse: Sinopse | None = None
    duracao_minutos: DuracaoMinutos | None = None
    data_lancamento: date | None = None
    url_poster: Url | None = None
    url_backdrop: Url | None = None

    @model_validator(mode="after")
    def _reject_explicit_nulls(self) -> Self:
        for field in _NON_NULLABLE_UPDATE_FIELDS:
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"O campo '{field}' não pode ser nulo.")
        return self

    def changes(self) -> dict[str, Any]:
        """Campos enviados pelo cliente, com os valores já validados."""

        return self.model_dump(exclude_unset=True)
