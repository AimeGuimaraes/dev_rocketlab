"""Erros de domínio compartilhados entre os services."""


class NotFoundError(Exception):
    """Recurso solicitado não existe."""


class InvalidReferenceError(Exception):
    """Os dados enviados referenciam um recurso que não existe (ex.: gênero)."""
