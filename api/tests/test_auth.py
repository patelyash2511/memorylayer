# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""Integration tests for the API key management system.

Tests the full flow:
  1. Register → get first API key
  2. Use key to store a memory
  3. GET /auth/me → ops_used = 1
  4. POST /auth/keys/create → second key
  5. Use second key to store another memory
  6. GET /auth/me → ops_used = 2 (shared!)
  7. GET /auth/keys → see both keys
  8. DELETE first key → still works with second
  9. Verify "r0_dev_key_2026" rejected in production mode
"""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from rec0.database import Base, get_db
from rec0.models import Account, ApiKey, AuthSession, Memory, UsageLog  # noqa: F401 — register all tables
from rec0.ratelimit import reset_rate_limiter
from api.main import app


# ── Fixtures ───────────────────────────────────────────────────────────────────


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
    """TestClient with in-memory DB and no legacy keys set."""
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


@pytest.fixture()
def prod_client(db_session, monkeypatch):
    """TestClient simulating production environment."""
    reset_rate_limiter()
    monkeypatch.setenv("SECRET_KEY", "test-secret-for-dashboard-key-reveal")
    monkeypatch.delenv("SECRET_KEY_HASH", raising=False)
    monkeypatch.setenv("REC0_ENV", "production")

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Helper ─────────────────────────────────────────────────────────────────────


def register(client: TestClient, email: str = "dev@example.com", name: str = "Yash", password: str = "testpass123") -> str:
    """Register an account and return the full API key."""
    resp = client.post("/v1/auth/register", json={"email": email, "name": name, "password": password})
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["api_key"].startswith("r0_live_sk_")
    assert data["warning"]
    assert "session_token" in data
    return data["api_key"]


# ── Registration tests ─────────────────────────────────────────────────────────


def test_register_success(client):
    resp = client.post("/v1/auth/register", json={"email": "user@test.com", "name": "Test", "password": "securepass1"})
    assert resp.status_code == 201
    data = resp.json()
    assert "account_id" in data
    assert data["email"] == "user@test.com"
    assert data["plan"] == "free"
    assert data["api_key"].startswith("r0_live_sk_")
    assert "key_prefix" in data
    assert data["warning"] == "Save this key now. You can reveal it later from the dashboard while signed in."
    assert data["session_token"].startswith("session_")


def test_register_duplicate_email(client):
    client.post("/v1/auth/register", json={"email": "dup@test.com", "password": "testpass123"})
    resp = client.post("/v1/auth/register", json={"email": "dup@test.com", "password": "testpass123"})
    assert resp.status_code == 409
    assert resp.json()["detail"]["error"] == "email_already_registered"


def test_register_invalid_email(client):
    resp = client.post("/v1/auth/register", json={"email": "notanemail"})
    assert resp.status_code == 422


# ── Full auth flow (steps 1–9) ─────────────────────────────────────────────────


def test_full_auth_flow(client):
    # 1. Register → get first key
    key1 = register(client, email="flow@test.com")
    h1 = {"X-API-Key": key1}

    # 2. Use key1 to store a memory
    resp = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "a1", "content": "User prefers dark mode"},
        headers=h1,
    )
    assert resp.status_code == 201

    # 3. GET /auth/me → ops_used = 1
    resp = client.get("/v1/auth/me", headers=h1)
    assert resp.status_code == 200
    data = resp.json()
    assert data["ops_used_this_month"] == 1
    assert data["keys_count"] == 1
    assert len(data["keys"]) == 1
    assert data["keys"][0]["key"] == key1
    assert data["keys"][0]["revealable"] is True

    # 4. Create second key
    resp = client.post(
        "/v1/auth/keys/create",
        json={"name": "Staging", "mode": "live"},
        headers=h1,
    )
    assert resp.status_code == 201
    key2 = resp.json()["api_key"]
    assert key2.startswith("r0_live_sk_")
    assert key2 != key1
    h2 = {"X-API-Key": key2}

    # 5. Use key2 to store another memory
    resp = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "a1", "content": "User speaks Spanish"},
        headers=h2,
    )
    assert resp.status_code == 201

    # 6. GET /auth/me → ops_used = 2 (shared across keys)
    resp = client.get("/v1/auth/me", headers=h1)
    assert resp.status_code == 200
    assert resp.json()["ops_used_this_month"] == 2
    assert resp.json()["keys_count"] == 2
    auth_me_keys = resp.json()["keys"]
    assert len(auth_me_keys) == 2
    assert {item["key"] for item in auth_me_keys} == {key1, key2}

    # 7. GET /auth/keys → see both keys
    resp = client.get("/v1/auth/keys", headers=h1)
    assert resp.status_code == 200
    keys = resp.json()["keys"]
    assert len(keys) == 2
    prefixes = [k["key_prefix"] for k in keys]
    assert all(p.endswith("...") for p in prefixes)
    # full keys are never returned
    for k in keys:
        assert "key_hash" not in k

    # 8. Delete key1; key2 still works
    key1_prefix = keys[0]["key_prefix"]
    resp = client.delete(f"/v1/auth/keys/{key1_prefix}", headers=h1)
    assert resp.status_code == 200
    assert resp.json()["revoked"] is True

    # key2 still authenticates
    resp = client.get("/v1/auth/me", headers=h2)
    assert resp.status_code == 200

    # deleted key1 no longer authenticates
    resp = client.get("/v1/auth/me", headers=h1)
    assert resp.status_code == 401


def test_cannot_delete_last_key(client):
    key = register(client, email="lastkey@test.com")
    h = {"X-API-Key": key}
    resp = client.get("/v1/auth/keys", headers=h)
    prefix = resp.json()["keys"][0]["key_prefix"]

    resp = client.delete(f"/v1/auth/keys/{prefix}", headers=h)
    assert resp.status_code == 400
    assert resp.json()["detail"]["error"] == "cannot_delete_last_key"


# ── Ops limit enforcement ──────────────────────────────────────────────────────


def test_ops_limit_enforced(client, db_session):
    key = register(client, email="opstest@test.com")
    h = {"X-API-Key": key}

    # Manually set ops_used to ops_limit on the account
    account = db_session.query(Account).filter(Account.email == "opstest@test.com").first()
    account.ops_used = account.ops_limit
    db_session.commit()

    resp = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "a1", "content": "Should be blocked"},
        headers=h,
    )
    assert resp.status_code == 429
    detail = resp.json()["detail"]
    assert detail["error"] == "ops_limit_exceeded"
    assert "upgrade_url" in detail


# ── Dev key behaviour ──────────────────────────────────────────────────────────


def test_dev_key_allowed_in_development(client):
    resp = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "a1", "content": "dev test"},
        headers={"X-API-Key": "r0_dev_key_2026"},
    )
    assert resp.status_code == 201


def test_dev_key_rejected_in_production(prod_client):
    resp = prod_client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "a1", "content": "should fail"},
        headers={"X-API-Key": "r0_dev_key_2026"},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"] == "invalid_api_key"


def test_dev_key_blocked_from_auth_endpoints(client):
    """Auth management endpoints require a real registered account."""
    resp = client.get("/v1/auth/me", headers={"X-API-Key": "r0_dev_key_2026"})
    assert resp.status_code == 403


# ── Invalid key ────────────────────────────────────────────────────────────────


def test_missing_key_rejected(client):
    resp = client.post(
        "/v1/memory/store",
        json={"user_id": "u1", "app_id": "a1", "content": "test"},
    )
    assert resp.status_code == 401


def test_wrong_key_rejected(client):
    resp = client.get("/v1/auth/me", headers={"X-API-Key": "r0_live_sk_totallywrong"})
    assert resp.status_code == 401


# ── Login / Logout / Session tests ─────────────────────────────────────────────


def test_login_success(client):
    register(client, email="login@test.com", password="mypassword1")
    resp = client.post("/v1/auth/login", json={"email": "login@test.com", "password": "mypassword1"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "login@test.com"
    assert data["session_token"].startswith("session_")
    assert "account_id" in data


def test_login_wrong_password(client):
    register(client, email="wrong@test.com", password="rightpass1")
    resp = client.post("/v1/auth/login", json={"email": "wrong@test.com", "password": "wrongpass1"})
    assert resp.status_code == 401
    assert resp.json()["detail"]["error"] == "invalid_credentials"


def test_login_unknown_email(client):
    resp = client.post("/v1/auth/login", json={"email": "nobody@test.com", "password": "whatever1"})
    assert resp.status_code == 401


def test_session_auth_me(client):
    """GET /auth/me works with X-Session-Token header."""
    resp = client.post("/v1/auth/register", json={"email": "sess@test.com", "name": "S", "password": "sesspass123"})
    token = resp.json()["session_token"]
    resp = client.get("/v1/auth/me", headers={"X-Session-Token": token})
    assert resp.status_code == 200
    assert resp.json()["email"] == "sess@test.com"
    assert len(resp.json()["keys"]) == 1


def test_auth_me_returns_non_revealable_legacy_keys(db_session, monkeypatch):
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
    with TestClient(app) as client:
        key = register(client, email="legacy@test.com")
        resp = client.get("/v1/auth/me", headers={"X-API-Key": key})
        assert resp.status_code == 200
        legacy_key = resp.json()["keys"][0]
        assert legacy_key["key"] is None
        assert legacy_key["revealable"] is False
    app.dependency_overrides.clear()


def test_logout_invalidates_session(client):
    resp = client.post("/v1/auth/register", json={"email": "out@test.com", "name": "O", "password": "outpass1234"})
    token = resp.json()["session_token"]
    # session works before logout
    assert client.get("/v1/auth/me", headers={"X-Session-Token": token}).status_code == 200
    # logout
    resp = client.post("/v1/auth/logout", headers={"X-Session-Token": token})
    assert resp.status_code == 200
    assert resp.json()["logged_out"] is True
    # session no longer works
    resp = client.get("/v1/auth/me", headers={"X-Session-Token": token})
    assert resp.status_code == 401


def test_invalid_session_rejected(client):
    resp = client.get("/v1/auth/me", headers={"X-Session-Token": "session_fake"})
    assert resp.status_code == 401


def test_register_password_too_short(client):
    resp = client.post("/v1/auth/register", json={"email": "short@test.com", "name": "S", "password": "abc"})
    assert resp.status_code == 422
