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
from api.main import app

TEST_SECRET = "test-secret-123"
API_HEADERS = {"X-API-Key": TEST_SECRET}


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
    monkeypatch.setenv("SECRET_KEY", TEST_SECRET)

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _store(client, content="Remember this."):
    r = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "app1", "content": content},
        headers=API_HEADERS,
    )
    assert r.status_code == 201
    return r.json()["id"]


def test_delete_soft_deletes_memory(client):
    memory_id = _store(client)
    # Confirm it shows up in list
    r = client.get("/v1/memory/list", params={"user_id": "u1", "app_id": "app1"}, headers=API_HEADERS)
    assert any(m["id"] == memory_id for m in r.json()["memories"])

    # Delete it
    r = client.delete(f"/v1/memory/{memory_id}", headers=API_HEADERS)
    assert r.status_code == 204

    # Confirm it's gone from list (soft-deleted, is_active=False)
    r = client.get("/v1/memory/list", params={"user_id": "u1", "app_id": "app1"}, headers=API_HEADERS)
    assert not any(m["id"] == memory_id for m in r.json()["memories"])


def test_delete_gone_from_recall(client):
    memory_id = _store(client, "I love hiking in mountains.")
    _store(client, "My favourite food is sushi.")

    # Delete the hiking memory
    client.delete(f"/v1/memory/{memory_id}", headers=API_HEADERS)

    # Recall should not return the deleted memory
    r = client.post(
        "/v1/memory/recall",
        json={"user_id": "u1", "app_id": "app1", "query": "hiking outdoor activities"},
        headers=API_HEADERS,
    )
    assert r.status_code == 200
    contents = [m["content"] for m in r.json()["memories"]]
    assert "I love hiking in mountains." not in contents


def test_delete_nonexistent_returns_404(client):
    r = client.delete("/v1/memory/00000000-0000-0000-0000-000000000000", headers=API_HEADERS)
    assert r.status_code == 404


def test_delete_requires_api_key(client):
    memory_id = _store(client)
    r = client.delete(f"/v1/memory/{memory_id}")
    assert r.status_code == 401
