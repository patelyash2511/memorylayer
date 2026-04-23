# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from rec0.database import Base, get_db
from rec0.models import Memory as MemoryModel  # noqa: F401
from rec0.ratelimit import reset_rate_limiter
from api.main import app

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
def client(db_session, monkeypatch):
    reset_rate_limiter()
    monkeypatch.delenv("SECRET_KEY", raising=False)
    monkeypatch.delenv("SECRET_KEY_HASH", raising=False)
    monkeypatch.setenv("REC0_ENV", "development")

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def api_headers(client):
    resp = client.post(
        "/v1/auth/register",
        json={"email": "delete-tests@example.com", "name": "Delete Tests", "password": "testpass123"},
    )
    assert resp.status_code == 201
    return {"X-API-Key": resp.json()["api_key"]}


def _store(client, api_headers, content="Remember this."):
    r = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "app1", "content": content},
        headers=api_headers,
    )
    assert r.status_code == 201
    return r.json()["id"]


def test_delete_soft_deletes_memory(client, api_headers):
    memory_id = _store(client, api_headers)
    # Confirm it shows up in list
    r = client.get("/v1/memory/list", params={"user_id": "u1", "app_id": "app1"}, headers=api_headers)
    assert any(m["id"] == memory_id for m in r.json()["memories"])

    # Delete it
    r = client.delete(f"/v1/memory/{memory_id}", headers=api_headers)
    assert r.status_code == 204

    # Confirm it's gone from list (soft-deleted, is_active=False)
    r = client.get("/v1/memory/list", params={"user_id": "u1", "app_id": "app1"}, headers=api_headers)
    assert not any(m["id"] == memory_id for m in r.json()["memories"])


def test_delete_gone_from_recall(client, api_headers):
    memory_id = _store(client, api_headers, "I love hiking in mountains.")
    _store(client, api_headers, "My favourite food is sushi.")

    # Delete the hiking memory
    client.delete(f"/v1/memory/{memory_id}", headers=api_headers)

    # Recall should not return the deleted memory
    r = client.post(
        "/v1/memory/recall",
        json={"user_id": "u1", "app_id": "app1", "query": "hiking outdoor activities"},
        headers=api_headers,
    )
    assert r.status_code == 200
    contents = [m["content"] for m in r.json()["memories"]]
    assert "I love hiking in mountains." not in contents


def test_delete_nonexistent_returns_404(client, api_headers):
    r = client.delete("/v1/memory/00000000-0000-0000-0000-000000000000", headers=api_headers)
    assert r.status_code == 404


def test_delete_requires_api_key(client, api_headers):
    memory_id = _store(client, api_headers)
    r = client.delete(f"/v1/memory/{memory_id}")
    assert r.status_code == 401
