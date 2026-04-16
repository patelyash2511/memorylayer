from __future__ import annotations

import requests


class Memory:
    """rec0 Python SDK — 3-line integration for LLM memory.

    Usage::

        from rec0.client import Memory
        client = Memory(api_key="r0_...", app_id="my-app", base_url="https://api.rec0.ai/v1")
        client.store("user_123", "The user prefers dark mode.")
        context = client.recall("user_123", "What are this user's preferences?")
    """

    def __init__(
        self,
        api_key: str,
        app_id: str,
        base_url: str = "http://localhost:8000/v1",
    ) -> None:
        self.api_key = api_key
        self.app_id = app_id
        self.base_url = base_url.rstrip("/")
        self._session = requests.Session()
        self._session.headers.update({"X-API-Key": api_key})

    def store(self, user_id: str, content: str) -> dict:
        """Store a memory. Returns the saved memory dict (including id and summary)."""
        r = self._session.post(
            f"{self.base_url}/memory/store",
            json={"user_id": user_id, "app_id": self.app_id, "content": content},
        )
        r.raise_for_status()
        return r.json()

    def recall(self, user_id: str, query: str, limit: int = 5) -> str:
        """Recall relevant memories as a formatted string ready for LLM injection."""
        r = self._session.post(
            f"{self.base_url}/memory/recall",
            json={
                "user_id": user_id,
                "app_id": self.app_id,
                "query": query,
                "limit": limit,
            },
        )
        r.raise_for_status()
        data = r.json()
        memories = data.get("memories", data) if isinstance(data, dict) else data
        if not memories:
            return "Relevant memories:\n(none)"
        lines = "\n".join(f"- {m['content']}" for m in memories)
        return f"Relevant memories:\n{lines}"

    def list(self, user_id: str) -> list:
        """Return all active memories for a user as a list of dicts."""
        r = self._session.get(
            f"{self.base_url}/memory/list",
            params={"user_id": user_id, "app_id": self.app_id},
        )
        r.raise_for_status()
        data = r.json()
        return data.get("memories", data) if isinstance(data, dict) else data

    def delete(self, memory_id: str) -> None:
        """Soft-delete a memory by ID (sets is_active=False)."""
        r = self._session.delete(f"{self.base_url}/memory/{memory_id}")
        r.raise_for_status()

    def delete_user(self, user_id: str, app_id: str | None = None) -> dict:
        """Hard-delete ALL memories for a user (GDPR right to erasure)."""
        params = {"app_id": app_id} if app_id else {}
        r = self._session.delete(
            f"{self.base_url}/users/{user_id}",
            params=params,
        )
        r.raise_for_status()
        return r.json()

    def export_user(self, user_id: str, app_id: str | None = None) -> dict:
        """Export all memories for a user as JSON (GDPR Article 20 portability)."""
        params = {"app_id": app_id} if app_id else {}
        r = self._session.get(
            f"{self.base_url}/users/{user_id}/export",
            params=params,
        )
        r.raise_for_status()
        return r.json()

