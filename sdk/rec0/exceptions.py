"""rec0 exceptions — every error maps to a meaningful Python type."""

from __future__ import annotations


class Rec0Error(Exception):
    """Base exception for all rec0 errors."""


class AuthError(Rec0Error):
    """Raised on 401 — invalid or missing API key."""


class RateLimitError(Rec0Error):
    """Raised on 429 — rate limit exceeded.

    Attributes:
        retry_after: seconds to wait before retrying.
    """

    def __init__(self, message: str, retry_after: int = 60) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class NotFoundError(Rec0Error):
    """Raised on 404 — resource not found."""


class ServerError(Rec0Error):
    """Raised on 5xx — unexpected server error."""
