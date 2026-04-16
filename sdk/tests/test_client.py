"""Unit tests for rec0 Memory client — all HTTP is mocked via responses."""

from __future__ import annotations

import json
import os
from datetime import datetime
from unittest.mock import patch

import pytest
import responses as resp_lib

from rec0 import Memory
from rec0.exceptions import AuthError, NotFoundError, RateLimitError, ServerError

BASE = "https://memorylayer-production.up.railway.app"

_MEMORY_PAYLOAD = {
    "id": "mem-001",
    "user_id": "u1",
    "app_id": "default",
    "content": "User prefers dark mode",
    "summary": "User prefers dark mode",
    "importance": 1.0,
    "recall_count": 0,
    "created_at": "2026-04-15T10:00:00",
    "updated_at": "2026-04-15T10:00:00",
    "is_active": True,
    "rec0_version": "1.0.0",
}

_RECALL_MEMORY = {**_MEMORY_PAYLOAD, "relevance_score": 0.92}


def _make_client(**kwargs):
    return Memory(api_key="r0_test_key", user_id="u1", **kwargs)


# ── store ──────────────────────────────────────────────────────────────────────

@resp_lib.activate
def test_store_success():
    resp_lib.add(resp_lib.POST, f"{BASE}/v1/memory/store", json=_MEMORY_PAYLOAD, status=201)
    mem = _make_client()
    result = mem.store("User prefers dark mode")
    assert result.id == "mem-001"
    assert result.content == "User prefers dark mode"
    assert result.relevance_score is None


# ── recall ─────────────────────────────────────────────────────────────────────

@resp_lib.activate
def test_recall_returns_sorted_by_relevance():
    high = {**_RECALL_MEMORY, "id": "h", "relevance_score": 0.95}
    low  = {**_RECALL_MEMORY, "id": "l", "relevance_score": 0.60}
    # API already returns sorted — SDK must preserve order
    resp_lib.add(
        resp_lib.POST,
        f"{BASE}/v1/memory/recall",
        json={"memories": [high, low], "total_memories": 2, "recall_time_ms": 12, "rec0_version": "1.0.0"},
        status=200,
    )
    mem = _make_client()
    results = mem.recall("dark mode")
    assert results[0].id == "h"
    assert results[0].relevance_score == 0.95
    assert results[1].id == "l"


# ── context ────────────────────────────────────────────────────────────────────

@resp_lib.activate
def test_context_returns_formatted_string():
    entry = {**_RECALL_MEMORY, "content": "User prefers dark mode"}
    resp_lib.add(
        resp_lib.POST,
        f"{BASE}/v1/memory/recall",
        json={"memories": [entry], "total_memories": 1, "recall_time_ms": 5, "rec0_version": "1.0.0"},
        status=200,
    )
    mem = _make_client()
    ctx = mem.context("preferences")
    assert ctx == "- User prefers dark mode"


@resp_lib.activate
def test_context_returns_empty_string_when_no_memories():
    resp_lib.add(
        resp_lib.POST,
        f"{BASE}/v1/memory/recall",
        json={"memories": [], "total_memories": 0, "recall_time_ms": 3, "rec0_version": "1.0.0"},
        status=200,
    )
    mem = _make_client()
    ctx = mem.context("preferences")
    assert ctx == ""


# ── error mapping ──────────────────────────────────────────────────────────────

@resp_lib.activate
def test_auth_error_on_401():
    resp_lib.add(
        resp_lib.POST,
        f"{BASE}/v1/memory/store",
        json={"detail": {"error": "invalid_api_key", "message": "Invalid or missing API key"}},
        status=401,
    )
    mem = _make_client()
    with pytest.raises(AuthError):
        mem.store("test")


@resp_lib.activate
def test_rate_limit_error_on_429():
    resp_lib.add(
        resp_lib.POST,
        f"{BASE}/v1/memory/store",
        json={
            "detail": {
                "error": "rate_limit_exceeded",
                "message": "Rate limit exceeded",
                "retry_after_seconds": 30,
            }
        },
        status=429,
    )
    # Disable the auto-retry so the test doesn't sleep
    with patch("time.sleep"):
        with pytest.raises(RateLimitError) as exc_info:
            _make_client().store("test")
    assert exc_info.value.retry_after == 30


@resp_lib.activate
def test_not_found_error_on_404():
    resp_lib.add(resp_lib.DELETE, f"{BASE}/v1/memory/nonexistent", status=404,
                 json={"detail": {"message": "No memory with id=nonexistent"}})
    mem = _make_client()
    with pytest.raises(NotFoundError):
        mem.delete("nonexistent")


@resp_lib.activate
def test_server_error_on_500():
    resp_lib.add(resp_lib.POST, f"{BASE}/v1/memory/store", status=500,
                 json={"detail": "Internal server error"})
    mem = _make_client()
    with pytest.raises(ServerError):
        mem.store("test")


# ── API key loading ────────────────────────────────────────────────────────────

def test_missing_api_key_raises_immediately():
    with patch.dict(os.environ, {}, clear=True):
        os.environ.pop("REC0_API_KEY", None)
        with pytest.raises(AuthError, match="No API key provided"):
            Memory(user_id="u1")


def test_env_var_api_key_loaded():
    with patch.dict(os.environ, {"REC0_API_KEY": "r0_from_env"}):
        mem = Memory(user_id="u1")
        assert mem._api_key == "r0_from_env"


# ── ping ───────────────────────────────────────────────────────────────────────

@resp_lib.activate
def test_ping_returns_true_on_healthy():
    resp_lib.add(resp_lib.GET, f"{BASE}/health", json={"status": "ok"}, status=200)
    assert _make_client().ping() is True


@resp_lib.activate
def test_ping_returns_false_on_error():
    resp_lib.add(resp_lib.GET, f"{BASE}/health", status=500)
    assert _make_client().ping() is False
