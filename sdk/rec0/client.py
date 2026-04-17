# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""rec0 sync client — Memory class backed by requests."""

from __future__ import annotations

import logging
import os
import time
from typing import List, Optional

import requests

from .exceptions import AuthError, NotFoundError, RateLimitError, Rec0Error, ServerError
from .models import MemoryObject, RecallResult
from .version import __version__

logger = logging.getLogger(__name__)

_DEFAULT_BASE_URL = "https://memorylayer-production.up.railway.app"
_DEFAULT_TIMEOUT = 10  # seconds


def _raise_for_response(resp: requests.Response) -> None:
    """Map HTTP error codes to typed exceptions."""
    if resp.status_code < 400:
        return
    try:
        body = resp.json()
        detail = body.get("detail", body)
        if isinstance(detail, dict):
            message = detail.get("message", str(detail))
        else:
            message = str(detail)
    except Exception:
        message = resp.text or f"HTTP {resp.status_code}"

    if resp.status_code == 401:
        raise AuthError(message)
    if resp.status_code == 404:
        raise NotFoundError(message)
    if resp.status_code == 429:
        retry_after = 60
        try:
            detail = resp.json().get("detail", {})
            if isinstance(detail, dict):
                retry_after = int(detail.get("retry_after_seconds", 60))
        except Exception:
            pass
        raise RateLimitError(message, retry_after=retry_after)
    if resp.status_code >= 500:
        raise ServerError(message)
    raise Rec0Error(f"HTTP {resp.status_code}: {message}")


class Memory:
    """Synchronous rec0 client.

    Example::

        from rec0 import Memory

        mem = Memory(api_key="r0_xxx", user_id="user_123")
        mem.store("User prefers dark mode")
        context = mem.context("user preferences")
    """

    def __init__(
        self,
        user_id: str,
        api_key: Optional[str] = None,
        app_id: str = "default",
        base_url: str = _DEFAULT_BASE_URL,
        timeout: int = _DEFAULT_TIMEOUT,
    ) -> None:
        resolved_key = api_key or os.environ.get("REC0_API_KEY", "")
        if not resolved_key:
            raise AuthError(
                "No API key provided. Pass api_key= or set REC0_API_KEY env var."
            )
        self._api_key = resolved_key
        self.user_id = user_id
        self.app_id = app_id
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._session = requests.Session()
        self._session.headers.update(
            {
                "X-API-Key": self._api_key,
                "Content-Type": "application/json",
                "User-Agent": f"rec0-python/{__version__}",
            }
        )

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _post(self, path: str, json: dict) -> requests.Response:
        try:
            resp = self._session.post(
                f"{self._base_url}{path}", json=json, timeout=self._timeout
            )
        except requests.Timeout:
            raise Rec0Error("Request timed out")
        except requests.ConnectionError as exc:
            raise Rec0Error(f"Connection error: {exc}")
        _raise_for_response(resp)
        return resp

    def _get(self, path: str, params: Optional[dict] = None) -> requests.Response:
        try:
            resp = self._session.get(
                f"{self._base_url}{path}", params=params, timeout=self._timeout
            )
        except requests.Timeout:
            raise Rec0Error("Request timed out")
        except requests.ConnectionError as exc:
            raise Rec0Error(f"Connection error: {exc}")
        _raise_for_response(resp)
        return resp

    def _delete(self, path: str) -> requests.Response:
        try:
            resp = self._session.delete(
                f"{self._base_url}{path}", timeout=self._timeout
            )
        except requests.Timeout:
            raise Rec0Error("Request timed out")
        except requests.ConnectionError as exc:
            raise Rec0Error(f"Connection error: {exc}")
        _raise_for_response(resp)
        return resp

    def _post_with_retry(self, path: str, json: dict) -> requests.Response:
        """POST with one automatic retry on RateLimitError."""
        try:
            return self._post(path, json)
        except RateLimitError as exc:
            logger.warning("rec0: rate limited, retrying in %ds...", exc.retry_after)
            time.sleep(exc.retry_after)
            return self._post(path, json)

    # ── Public API ─────────────────────────────────────────────────────────────

    def store(self, content: str) -> MemoryObject:
        """Store a new memory.

        Args:
            content: The text to remember.

        Returns:
            The stored :class:`MemoryObject`.
        """
        resp = self._post_with_retry(
            "/v1/memory/store",
            {"user_id": self.user_id, "app_id": self.app_id, "content": content},
        )
        return MemoryObject._from_dict(resp.json())

    def recall(self, query: str, limit: int = 5) -> List[MemoryObject]:
        """Recall memories most relevant to *query*.

        Args:
            query: Natural language query.
            limit: Maximum number of results to return (default 5).

        Returns:
            List of :class:`MemoryObject` sorted by relevance (highest first).
        """
        resp = self._post_with_retry(
            "/v1/memory/recall",
            {
                "user_id": self.user_id,
                "app_id": self.app_id,
                "query": query,
                "limit": limit,
            },
        )
        data = resp.json()
        return [MemoryObject._from_dict(m) for m in data.get("memories", [])]

    def context(self, query: str, limit: int = 5) -> str:
        """Build a context string ready to inject into any LLM prompt.

        Args:
            query: What you want to remember about the user.
            limit: Maximum memories to include (default 5).

        Returns:
            Newline-separated bullet list: ``"- memory1\\n- memory2\\n..."``
            Returns an empty string when no memories exist.
        """
        memories = self.recall(query, limit=limit)
        return "\n".join(f"- {m.content}" for m in memories)

    def list(self) -> List[MemoryObject]:
        """List all active memories for this user, ordered by creation time."""
        resp = self._get(
            "/v1/memory/list",
            params={"user_id": self.user_id, "app_id": self.app_id},
        )
        data = resp.json()
        return [MemoryObject._from_dict(m) for m in data.get("memories", [])]

    def delete(self, memory_id: str) -> None:
        """Soft-delete a specific memory by ID."""
        self._delete(f"/v1/memory/{memory_id}")

    def delete_user(self) -> dict:
        """GDPR right-to-erasure: delete all memories for this user.

        Returns:
            ``{"deleted": True, "memories_removed": N}``
        """
        resp = self._delete(f"/v1/users/{self.user_id}")
        if resp.status_code == 204 or not resp.content:
            return {"deleted": True, "memories_removed": 0}
        return resp.json()

    def export(self) -> dict:
        """GDPR data export: return all memories for this user as a dict."""
        resp = self._get(f"/v1/users/{self.user_id}/export")
        return resp.json()

    def ping(self) -> bool:
        """Check connectivity and confirm the API key works.

        Returns:
            ``True`` if the server is reachable, ``False`` otherwise.
        """
        try:
            self._get("/health")
            return True
        except Exception:
            return False
