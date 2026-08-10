from pydantic import ValidationError


class ApiError(Exception):
    """A domain-level error with a user-facing message and HTTP status code."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def pydantic_error_response(exc: ValidationError) -> dict:
    return {
        "error": "validation_error",
        "details": [
            {"field": ".".join(str(p) for p in err["loc"]), "message": err["msg"]}
            for err in exc.errors()
        ],
    }
