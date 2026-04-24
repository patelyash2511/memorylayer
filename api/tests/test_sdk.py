# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""
SDK tests for memorylayer.client.Memory.

Strategy: mount the FastAPI app on a TestClient (httpx-backed) and
patch the requests.Session so all HTTP calls are routed through it.
This lets us test the SDK against a real in-memory database with no
live server required.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, MagicMock

import requests

from rec0.database import Base, get_db
from rec0.models import Memory as MemoryModel  # noqa: F401
from rec0.ratelimit import reset_rate_limiter
from rec0.client import Memory
from main import app

APP_ID = "test-app"
USER_ID = "sdk-user"


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def api_client(db_session, monkeypatch):
    """FastAPI TestClient wired to in-memory DB."""
    reset_rate_limiter()
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("SECRET_KEY_HASH", raising=False)
    monkeypatch.setenv("REC0_ENV", "development")

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def sdk(api_client, monkeypatch):
    """
    Memory SDK whose requests.Session is bridged to the FastAPI TestClient.
    We replace each HTTP method on the session with a wrapper that delegates
    to the TestClient, so no real network is used.
    """
    register = api_client.post(
        "/v1/auth/register",
        json={"email": "sdk-tests@example.com", "name": "SDK Tests", "password": "testpass123"},
    )
    assert register.status_code == 201
    api_key = register.json()["api_key"]

    client = Memory(api_key=api_key, app_id=APP_ID, base_url="http://testserver/v1")

    # Capture session-level headers (e.g. X-API-Key) before we monkey-patch
    session_headers = dict(client._session.headers)

    def _bridge(method: str):
        def call(url: str, **kwargs):
            # Strip the fake base so TestClient gets a relative path
            path = url.replace("http://testserver", "")
            # Merge session-level headers with any per-call headers
            merged_headers = {**session_headers, **kwargs.pop("headers", {})}
            tc_response = getattr(api_client, method)(path, headers=merged_headers, **kwargs)
            # Wrap in a real requests.Response-like object
            mock_resp = MagicMock(spec=requests.Response)
            mock_resp.status_code = tc_response.status_code
            mock_resp.json.return_value = tc_response.json()
            # raise_for_status raises only on 4xx/5xx
            if tc_response.status_code >= 400:
                mock_resp.raise_for_status.side_effect = requests.HTTPError(
                    response=mock_resp
                )
            else:
                mock_resp.raise_for_status.return_value = None
            return mock_resp

        return call

    client._session.post = _bridge("post")
    client._session.get = _bridge("get")
    client._session.delete = _bridge("delete")
    return client


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_store_returns_memory_id(sdk):
    result = sdk.store(USER_ID, "I enjoy hiking on weekends.")
    assert "id" in result
    assert result["content"] == "I enjoy hiking on weekends."
    assert result["user_id"] == USER_ID


def test_recall_returns_formatted_string(sdk):
    sdk.store(USER_ID, "I love hiking in the mountains.")
    sdk.store(USER_ID, "My favourite food is ramen.")
    sdk.store(USER_ID, "I go hiking every Sunday morning.")

    result = sdk.recall(USER_ID, "outdoor activities I enjoy", limit=2)
    assert result.startswith("Relevant memories:")
    assert "- " in result
    # Should surface hiking-related memories near the top
    lines = result.splitlines()
    assert len(lines) == 3  # header + 2 bullets


def test_recall_no_memories_returns_none_string(sdk):
    result = sdk.recall("ghost-user", "anything", limit=5)
    assert result == "Relevant memories:\n(none)"


def test_list_returns_all_memories(sdk):
    sdk.store(USER_ID, "Memory A")
    sdk.store(USER_ID, "Memory B")
    sdk.store(USER_ID, "Memory C")

    memories = sdk.list(USER_ID)
    assert isinstance(memories, list)
    assert len(memories) == 3
    contents = [m["content"] for m in memories]
    assert "Memory A" in contents
    assert "Memory B" in contents
    assert "Memory C" in contents


def test_list_empty_for_unknown_user(sdk):
    assert sdk.list("unknown-user") == []


def test_store_invalid_content_raises(sdk):
    with pytest.raises(requests.HTTPError):
        sdk.store(USER_ID, "")
