# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from rec0.database import Base, get_db
from rec0.models import Memory  # noqa: F401
from rec0.ratelimit import reset_rate_limiter
from api.main import app

MEMORIES = [
    {"user_id": "u1", "app_id": "app1", "content": "I love eating pizza on Fridays"},
    {"user_id": "u1", "app_id": "app1", "content": "My favourite sport is basketball"},
    {"user_id": "u1", "app_id": "app1", "content": "I usually eat sushi on weekends"},
]


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
        json={"email": "recall-tests@example.com", "name": "Recall Tests", "password": "testpass123"},
    )
    assert resp.status_code == 201
    return {"X-API-Key": resp.json()["api_key"]}


def _store_all(client, api_headers):
    for mem in MEMORIES:
        r = client.post("/v1/memory/store", json=mem, headers=api_headers)
        assert r.status_code == 201


def test_recall_top_result_is_most_relevant(client, api_headers):
    _store_all(client, api_headers)
    response = client.post(
        "/v1/memory/recall",
        json={"user_id": "u1", "app_id": "app1", "query": "what food do I like?", "limit": 3},
        headers=api_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert "memories" in data
    assert "total_memories" in data
    assert "recall_time_ms" in data
    results = data["memories"]
    assert len(results) == 3
    # All results have a relevance_score field
    for r in results:
        assert "relevance_score" in r
    # Scores are sorted descending
    scores = [r["relevance_score"] for r in results]
    assert scores == sorted(scores, reverse=True)
    # The top result should be one of the food-related memories
    assert any(
        keyword in results[0]["content"].lower()
        for keyword in ("pizza", "sushi", "eat")
    )


def test_recall_respects_limit(client, api_headers):
    _store_all(client, api_headers)
    response = client.post(
        "/v1/memory/recall",
        json={"user_id": "u1", "app_id": "app1", "query": "food", "limit": 2},
        headers=api_headers,
    )
    assert response.status_code == 200
    assert len(response.json()["memories"]) == 2


def test_recall_empty_returns_empty_list(client, api_headers):
    response = client.post(
        "/v1/memory/recall",
        json={"user_id": "nobody", "app_id": "app1", "query": "anything"},
        headers=api_headers,
    )
    assert response.status_code == 200
    assert response.json()["memories"] == []
    assert response.json()["total_memories"] == 0


def test_recall_requires_api_key(client):
    response = client.post(
        "/v1/memory/recall",
        json={"user_id": "u1", "app_id": "app1", "query": "food"},
    )
    assert response.status_code == 401


def test_list_returns_all_memories(client, api_headers):
    _store_all(client, api_headers)
    response = client.get(
        "/v1/memory/list",
        params={"user_id": "u1", "app_id": "app1"},
        headers=api_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["memories"]) == 3
    assert data["total_memories"] == 3
    assert data["rec0_version"] == "1.0.0"
    assert data["limit"] == 20
    assert data["offset"] == 0

def test_list_empty_for_unknown_user(client, api_headers):
    response = client.get(
        "/v1/memory/list",
        params={"user_id": "nobody", "app_id": "app1"},
        headers=api_headers,
    )
    assert response.status_code == 200
    assert response.json()["memories"] == []
    assert response.json()["total_memories"] == 0


def test_list_requires_api_key(client):
    response = client.get(
        "/v1/memory/list",
        params={"user_id": "u1", "app_id": "app1"},
    )
    assert response.status_code == 401
