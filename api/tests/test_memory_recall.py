import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from rec0.database import Base, get_db
from rec0.models import Memory  # noqa: F401
from api.main import app

TEST_SECRET = "test-secret-123"
API_HEADERS = {"X-API-Key": TEST_SECRET}

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
    monkeypatch.setenv("SECRET_KEY", TEST_SECRET)

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _store_all(client):
    for mem in MEMORIES:
        r = client.post("/v1/memory/store", json=mem, headers=API_HEADERS)
        assert r.status_code == 201


def test_recall_top_result_is_most_relevant(client):
    _store_all(client)
    response = client.post(
        "/v1/memory/recall",
        json={"user_id": "u1", "app_id": "app1", "query": "what food do I like?", "limit": 3},
        headers=API_HEADERS,
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


def test_recall_respects_limit(client):
    _store_all(client)
    response = client.post(
        "/v1/memory/recall",
        json={"user_id": "u1", "app_id": "app1", "query": "food", "limit": 2},
        headers=API_HEADERS,
    )
    assert response.status_code == 200
    assert len(response.json()["memories"]) == 2


def test_recall_empty_returns_empty_list(client):
    response = client.post(
        "/v1/memory/recall",
        json={"user_id": "nobody", "app_id": "app1", "query": "anything"},
        headers=API_HEADERS,
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


def test_list_returns_all_memories(client):
    _store_all(client)
    response = client.get(
        "/v1/memory/list",
        params={"user_id": "u1", "app_id": "app1"},
        headers=API_HEADERS,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["memories"]) == 3
    assert data["total_memories"] == 3
    assert data["rec0_version"] == "1.0.0"

def test_list_empty_for_unknown_user(client):
    response = client.get(
        "/v1/memory/list",
        params={"user_id": "nobody", "app_id": "app1"},
        headers=API_HEADERS,
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
