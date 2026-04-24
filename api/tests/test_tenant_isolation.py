from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from rec0.database import Base, get_db
from rec0.models import Account, ApiKey, AuthSession, Memory, UsageLog  # noqa: F401
from rec0.ratelimit import reset_rate_limiter
from main import app


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
    monkeypatch.setenv("SECRET_KEY", "test-secret-for-dashboard-key-reveal")
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


def create_account_key(client: TestClient, email: str) -> str:
    response = client.post(
        "/v1/auth/register",
        json={"email": email, "name": "Tenant", "password": "tenantpass123"},
    )
    assert response.status_code == 201, response.text
    return response.json()["api_key"]


def test_cannot_access_other_tenant_memories(client: TestClient):
    tenant_a_key = create_account_key(client, "tenant_a@test.com")
    tenant_b_key = create_account_key(client, "tenant_b@test.com")

    store_response = client.post(
        "/v1/memory/store",
        headers={"X-API-Key": tenant_a_key},
        json={"user_id": "user_123", "app_id": "app_a", "content": "Tenant A secret data"},
    )
    assert store_response.status_code == 201

    recall_response = client.post(
        "/v1/memory/recall",
        headers={"X-API-Key": tenant_b_key},
        json={"user_id": "user_123", "app_id": "app_a", "query": "secret"},
    )

    assert recall_response.status_code == 200
    assert recall_response.json()["memories"] == []


def test_cannot_delete_other_tenant_memories(client: TestClient):
    tenant_a_key = create_account_key(client, "tenant_a_delete@test.com")
    tenant_b_key = create_account_key(client, "tenant_b_delete@test.com")

    store_response = client.post(
        "/v1/memory/store",
        headers={"X-API-Key": tenant_a_key},
        json={"user_id": "user_123", "app_id": "app_del", "content": "Tenant A data"},
    )
    assert store_response.status_code == 201
    memory_id = store_response.json()["id"]

    delete_response = client.delete(
        f"/v1/memory/{memory_id}",
        headers={"X-API-Key": tenant_b_key},
    )
    assert delete_response.status_code == 404


def test_gdpr_delete_scoped_to_tenant(client: TestClient):
    tenant_a_key = create_account_key(client, "tenant_a_gdpr@test.com")
    tenant_b_key = create_account_key(client, "tenant_b_gdpr@test.com")

    response_a = client.post(
        "/v1/memory/store",
        headers={"X-API-Key": tenant_a_key},
        json={"user_id": "user_123", "app_id": "app_gdpr", "content": "Tenant A data"},
    )
    assert response_a.status_code == 201

    response_b = client.post(
        "/v1/memory/store",
        headers={"X-API-Key": tenant_b_key},
        json={"user_id": "user_123", "app_id": "app_gdpr", "content": "Tenant B data"},
    )
    assert response_b.status_code == 201

    delete_response = client.delete(
        "/v1/users/user_123",
        params={"app_id": "app_gdpr"},
        headers={"X-API-Key": tenant_a_key},
    )
    assert delete_response.status_code == 200

    recall_a = client.post(
        "/v1/memory/recall",
        headers={"X-API-Key": tenant_a_key},
        json={"user_id": "user_123", "app_id": "app_gdpr", "query": "data"},
    )
    assert recall_a.status_code == 200
    assert recall_a.json()["memories"] == []

    recall_b = client.post(
        "/v1/memory/recall",
        headers={"X-API-Key": tenant_b_key},
        json={"user_id": "user_123", "app_id": "app_gdpr", "query": "data"},
    )
    assert recall_b.status_code == 200
    assert len(recall_b.json()["memories"]) == 1
