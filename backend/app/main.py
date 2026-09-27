from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.exception_handlers import register_exception_handlers
from app.core.logging import configure_logging
from app.db.session import engine

configure_logging()
settings = get_settings()

OPENAPI_TAGS = [
    {"name": "movies", "description": "Catálogo de filmes: listagem, detalhe e cadastro."},
    {"name": "reviews", "description": "Avaliações dos filmes (nota de 0 a 10 e resenha)."},
    {"name": "genres", "description": "Gêneros disponíveis para filtro e cadastro."},
    {"name": "health", "description": "Verificação de disponibilidade da API."},
]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Libera recursos de infraestrutura quando a aplicação é encerrada."""

    del app
    # A criação/evolução do schema é responsabilidade exclusiva do Alembic.
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version=settings.project_version,
        description=(
            "API de catálogo e avaliação de filmes. Notas vão de 0 a 10. Erros seguem o "
            'formato `{"detail": "...", "errors": [{"field": "...", "message": "..."}] | null}`.'
        ),
        openapi_tags=OPENAPI_TAGS,
        lifespan=lifespan,
    )

    # Antes do CORS: o CORSMiddleware precisa envolver o middleware de erro 500.
    register_exception_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.backend_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["health"], summary="Status da API")
    async def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
