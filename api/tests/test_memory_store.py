# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from rec0.database import Base, get_db
from rec0.models import Memory  # noqa: F401 — ensures table is registered
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
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def api_headers(client):
    resp = client.post(
        "/v1/auth/register",
        json={"email": "store-tests@example.com", "name": "Store Tests", "password": "testpass123"},
    )
    assert resp.status_code == 201
    return {"X-API-Key": resp.json()["api_key"]}


def test_store_memory_success(client, api_headers):
    response = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "app1", "content": "Remember this."},
        headers=api_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["content"] == "Remember this."
    assert data["user_id"] == "u1"
    assert data["is_active"] is True


def test_store_memory_empty_content(client, api_headers):
    response = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "app1", "content": ""},
        headers=api_headers,
    )
    assert response.status_code == 422


def test_store_memory_whitespace_content(client, api_headers):
    response = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "app1", "content": "   "},
        headers=api_headers,
    )
    assert response.status_code == 422


def test_store_memory_content_too_long(client, api_headers):
    response = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "app1", "content": "x" * 2001},
        headers=api_headers,
    )
    assert response.status_code == 422


def test_store_memory_missing_api_key(client):
    response = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "app1", "content": "Remember this."},
    )
    assert response.status_code == 401


def test_store_memory_wrong_api_key(client):
    response = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "app1", "content": "Remember this."},
        headers={"X-API-Key": "wrong-key"},
    )
    assert response.status_code == 401
