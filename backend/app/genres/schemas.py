"""Schemas Pydantic do domínio de gêneros."""

from pydantic import BaseModel, ConfigDict


class GenreRead(BaseModel):
    """Gênero disponível para filtros e formulários."""

    model_config = ConfigDict(from_attributes=True)

    sk_genre_id: str
    nome_genero: str
