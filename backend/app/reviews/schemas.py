"""Schemas Pydantic de entrada e saída do domínio de avaliações."""

from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints

from app.common.schemas import UtcDatetime

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100


def _round_nota(value: float) -> float:
    """Arredonda a nota para uma casa decimal, com meio para cima (7,25 → 7,3).

    Usa ``Decimal`` a partir do texto do número para evitar o arredondamento bancário e as
    imprecisões binárias do ``round()``.
    """

    return float(Decimal(str(value)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))


NomeAvaliador = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]
Comentario = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]
# A faixa é validada antes do arredondamento: 10,04 é rejeitado.
Nota = Annotated[float, Field(ge=0, le=10, allow_inf_nan=False), AfterValidator(_round_nota)]


class ReviewCreate(BaseModel):
    """Dados para avaliar um filme (nota de 0 a 10 e resenha)."""

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [{"nome": "Ana", "nota": 8.5, "comentario": "Roteiro excelente."}]
        },
    )

    nome: NomeAvaliador
    nota: Nota
    comentario: Comentario


class ReviewRead(BaseModel):
    """Avaliação individual de um filme."""

    model_config = ConfigDict(from_attributes=True)

    sk_movie_review_id: str
    nome: str
    nota: float
    comentario: str
    created_at: UtcDatetime


class ReviewCreated(BaseModel):
    """Avaliação recém-criada e o resumo de avaliações do filme já recalculado."""

    avaliacao: ReviewRead
    nota_media: float
    qtd_avaliacoes: int
