"""Erros de domínio compartilhados entre os services."""


class NotFoundError(Exception):
    """Recurso solicitado não existe."""


class InvalidReferenceError(Exception):
    """Os dados enviados referenciam um recurso que não existe (ex.: gênero).

    ``field`` indica o campo da requisição que contém a referência inválida, quando houver.
    """

    def __init__(self, message: str, field: str | None = None) -> None:
        super().__init__(message)
        self.field = field
