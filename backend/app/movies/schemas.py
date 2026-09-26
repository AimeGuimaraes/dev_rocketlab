"""Schemas Pydantic de entrada e saída do domínio de filmes."""

from pydantic import BaseModel

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class MovieListItem(BaseModel):
    """Filme resumido para a listagem do catálogo."""

    sk_movie_id: str
    titulo: str
    ano_lancamento: int | None
    url_poster: str | None
    generos: list[str]
    nota_media: float | None
    qtd_avaliacoes: int
