# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""rec0 async client — AsyncMemory class backed by httpx."""

from __future__ import annotations

import logging
import asyncio
import os
from typing import List, Optional

import httpx

from .exceptions import AuthError, NotFoundError, RateLimitError, Rec0Error, ServerError
from .models import MemoryObject, RecallResult
from .version import __version__

logger = logging.getLogger(__name__)

_DEFAULT_BASE_URL = "https://memorylayer-production.up.railway.app"
_DEFAULT_TIMEOUT = 10  # seconds


def _raise_for_response(resp: httpx.Response) -> None:
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


class AsyncMemory:
    """Asynchronous rec0 client.

    Example::

        from rec0 import AsyncMemory

        async def main():
            mem = AsyncMemory(api_key="r0_xxx", user_id="user_123")
            await mem.store("User is a Python developer")
            context = await mem.context("user preferences")
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
        self._headers = {
            "X-API-Key": self._api_key,
            "Content-Type": "application/json",
            "User-Agent": f"rec0-python/{__version__}",
        }

    # ── Internal helpers ───────────────────────────────────────────────────────

    async def _post(self, path: str, json: dict) -> httpx.Response:
        try:
            async with httpx.AsyncClient(
                headers=self._headers, timeout=self._timeout
            ) as client:
                resp = await client.post(f"{self._base_url}{path}", json=json)
        except httpx.TimeoutException:
            raise Rec0Error("Request timed out")
        except httpx.ConnectError as exc:
            raise Rec0Error(f"Connection error: {exc}")
        _raise_for_response(resp)
        return resp

    async def _get(self, path: str, params: Optional[dict] = None) -> httpx.Response:
        try:
            async with httpx.AsyncClient(
                headers=self._headers, timeout=self._timeout
            ) as client:
                resp = await client.get(f"{self._base_url}{path}", params=params)
        except httpx.TimeoutException:
            raise Rec0Error("Request timed out")
        except httpx.ConnectError as exc:
            raise Rec0Error(f"Connection error: {exc}")
        _raise_for_response(resp)
        return resp

    async def _delete(self, path: str) -> httpx.Response:
        try:
            async with httpx.AsyncClient(
                headers=self._headers, timeout=self._timeout
            ) as client:
                resp = await client.delete(f"{self._base_url}{path}")
        except httpx.TimeoutException:
            raise Rec0Error("Request timed out")
        except httpx.ConnectError as exc:
            raise Rec0Error(f"Connection error: {exc}")
        _raise_for_response(resp)
        return resp

    async def _post_with_retry(self, path: str, json: dict) -> httpx.Response:
        """POST with one automatic retry on RateLimitError."""
        try:
            return await self._post(path, json)
        except RateLimitError as exc:
            logger.warning("rec0: rate limited, retrying in %ds...", exc.retry_after)
            await asyncio.sleep(exc.retry_after)
            return await self._post(path, json)

    # ── Public API ─────────────────────────────────────────────────────────────

    async def store(self, content: str) -> MemoryObject:
        """Store a new memory."""
        resp = await self._post_with_retry(
            "/v1/memory/store",
            {"user_id": self.user_id, "app_id": self.app_id, "content": content},
        )
        return MemoryObject._from_dict(resp.json())

    async def recall(self, query: str, limit: int = 5) -> List[MemoryObject]:
        """Recall memories most relevant to *query*."""
        resp = await self._post_with_retry(
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

    async def context(self, query: str, limit: int = 5) -> str:
        """Build a context string ready to inject into any LLM prompt."""
        memories = await self.recall(query, limit=limit)
        return "\n".join(f"- {m.content}" for m in memories)

    async def list(self) -> List[MemoryObject]:
        """List all active memories for this user."""
        resp = await self._get(
            "/v1/memory/list",
            params={"user_id": self.user_id, "app_id": self.app_id},
        )
        data = resp.json()
        return [MemoryObject._from_dict(m) for m in data.get("memories", [])]

    async def delete(self, memory_id: str) -> None:
        """Soft-delete a specific memory by ID."""
        await self._delete(f"/v1/memory/{memory_id}")

    async def delete_user(self) -> dict:
        """GDPR right-to-erasure: delete all memories for this user."""
        resp = await self._delete(f"/v1/users/{self.user_id}")
        if resp.status_code == 204 or not resp.content:
            return {"deleted": True, "memories_removed": 0}
        return resp.json()

    async def export(self) -> dict:
        """GDPR data export: return all memories for this user as a dict."""
        resp = await self._get(f"/v1/users/{self.user_id}/export")
        return resp.json()

    async def ping(self) -> bool:
        """Check connectivity. Returns True if server is reachable."""
        try:
            await self._get("/health")
            return True
        except Exception:
            return False
