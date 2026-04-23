# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""Auth management endpoints for rec0.

Endpoints:
  POST   /auth/register          — create account + first API key
  POST   /auth/login              — email + password login
  POST   /auth/logout             — invalidate session
  POST   /auth/keys/create       — generate additional key for an account
  GET    /auth/keys              — list all keys for an account
  DELETE /auth/keys/{key_prefix} — soft-delete a key (set is_active=False)
  GET    /auth/me                — account info + usage
"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from rec0.database import get_db
from rec0.keygen import check_api_key, generate_api_key
from rec0.keyvault import decrypt_api_key, encrypt_api_key
from rec0.models import Account, ApiKey, AuthSession, UsageLog
from rec0.ratelimit import REGISTER_LIMIT, check_rate_limit
from rec0.schemas import (
    AccountKeyInfo,
    AccountMeResponse,
    KeyCreateRequest,
    KeyCreateResponse,
    KeyInfo,
    KeyListResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RegisterRequest,
    RegisterResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────

_DEV_KEY = "r0_dev_key_2026"
_SESSION_DAYS = 30
_SESSION_COOKIE = "session_token"


def _create_session(account_id: str, db: Session) -> str:
    """Create a new session token for an account and persist it."""
    token = f"session_{secrets.token_urlsafe(32)}"
    now = datetime.now(timezone.utc)
    session_row = AuthSession(
        account_id=account_id,
        session_token=token,
        expires_at=now + timedelta(days=_SESSION_DAYS),
        last_used_at=now,
    )
    db.add(session_row)
    return token


def _is_production(request: Request) -> bool:
    """True when running behind an HTTPS reverse proxy (e.g. Railway).

    Railway (and most PaaS proxies) terminate TLS and forward plain HTTP to
    the container, so request.url.scheme is always 'http' inside the pod.
    We detect production by checking X-Forwarded-Proto first, then the
    REC0_ENV env-var as a manual override.
    """
    forwarded_proto = request.headers.get("x-forwarded-proto", "")
    if forwarded_proto:
        return forwarded_proto.lower() == "https"
    env = os.environ.get("REC0_ENV", "development")
    return request.url.scheme == "https" or env == "production"


def _set_session_cookie(response: Response, token: str, request: Request) -> None:
    production = _is_production(request)
    # Cross-origin frontend (Vercel) -> API (Railway) requires SameSite=None;
    # SameSite=None is only valid with Secure=True.
    response.set_cookie(
        key=_SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=production,
        samesite="none" if production else "strict",
        max_age=_SESSION_DAYS * 24 * 60 * 60,
        path="/",
    )


def _clear_session_cookie(response: Response, request: Request) -> None:
    production = _is_production(request)
    response.delete_cookie(
        key=_SESSION_COOKIE,
        httponly=True,
        secure=production,
        samesite="none" if production else "strict",
        path="/",
    )


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": "invalid_api_key",
            "message": "Invalid or missing API key",
            "docs": "https://docs.rec0.ai/errors",
        },
    )


def _get_account_for_key(
    x_api_key: Optional[str],
    db: Session,
) -> Account:
    """Resolve an API key to its Account. No legacy fallbacks — real accounts only."""
    if not x_api_key:
        raise _auth_error()

    env = os.environ.get("REC0_ENV", "development")
    if x_api_key == _DEV_KEY:
        if env == "production":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "invalid_api_key",
                    "message": "Register at rec0.ai to get your free API key.",
                    "docs": "https://docs.rec0.ai/quickstart",
                },
            )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "dev_key_not_supported",
                "message": (
                    "The dev key does not have an account. "
                    "Register at /v1/auth/register to use auth endpoints."
                ),
                "docs": "https://docs.rec0.ai/quickstart",
            },
        )

    prefix = x_api_key[:20] + "..." if len(x_api_key) >= 20 else x_api_key

    candidates = (
        db.query(ApiKey)
        .filter(ApiKey.key_prefix == prefix, ApiKey.is_active.is_(True))
        .all()
    )

    for candidate in candidates:
        if check_api_key(x_api_key, candidate.key_hash):
            account = db.query(Account).filter(Account.id == candidate.account_id).first()
            if account:
                return account

    raise _auth_error()


def _get_account_for_session(token: str, db: Session) -> Account:
    """Resolve a session token to its Account."""
    now = datetime.now(timezone.utc)
    session_row = (
        db.query(AuthSession)
        .filter(AuthSession.session_token == token, AuthSession.expires_at > now)
        .first()
    )
    if not session_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_session", "message": "Session expired or invalid."},
        )
    account = db.query(Account).filter(Account.id == session_row.account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_session", "message": "Account not found."},
        )
    session_row.last_used_at = now
    db.commit()
    return account


def get_current_account(
    x_api_key: Optional[str] = Header(default=None),
    x_session_token: Optional[str] = Header(default=None),
    session_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> Account:
    """FastAPI dependency — returns Account for the authenticated key or session."""
    if x_api_key:
        return _get_account_for_key(x_api_key, db)

    token = x_session_token or session_token
    if token:
        return _get_account_for_session(token, db)

    return _get_account_for_key(x_api_key, db)


# ── POST /auth/register ────────────────────────────────────────────────────────


@router.post(
    "/auth/register",
    response_model=RegisterResponse,
    status_code=201,
    summary="Register and get your first API key",
    description=(
        "Create a free account and receive your first API key. "
        "The full key is shown ONCE — save it immediately."
    ),
)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> RegisterResponse:
    """Create account + auto-generate first API key."""
    # Rate limit: 5 registrations per IP per hour
    client_ip = request.client.host if request.client else "unknown"
    allowed, retry_after = check_rate_limit(f"reg:{client_ip}", limit=REGISTER_LIMIT)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limit_exceeded",
                "message": f"Too many registration attempts. Retry after {retry_after}s.",
                "retry_after_seconds": retry_after,
            },
        )

    # Check for duplicate email
    existing = db.query(Account).filter(Account.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "email_already_registered",
                "message": (
                    f"{payload.email} is already registered. "
                    "Use GET /v1/auth/keys to manage your keys."
                ),
            },
        )

    # Create account with password hash
    password_hash = bcrypt.hashpw(
        payload.password.encode("utf-8"),
        bcrypt.gensalt(rounds=12),
    ).decode("utf-8")
    account = Account(email=payload.email, name=payload.name, password_hash=password_hash)
    db.add(account)
    db.flush()  # get account.id before creating the key

    # Generate first API key
    full_key, key_prefix, key_hash = generate_api_key(mode="live")
    api_key_row = ApiKey(
        account_id=account.id,
        key_hash=key_hash,
        encrypted_key=encrypt_api_key(full_key),
        key_prefix=key_prefix,
        name="Default key",
    )
    db.add(api_key_row)

    # Create session
    session_token = _create_session(str(account.id), db)

    db.commit()
    _set_session_cookie(response, session_token, request)

    logger.info("Account registered: email=%s account_id=%s key_prefix=%s", payload.email, account.id, key_prefix)

    return RegisterResponse(
        account_id=str(account.id),
        email=account.email,
        plan=account.plan,
        api_key=full_key,
        key_prefix=key_prefix,
    )


# ── POST /auth/login ───────────────────────────────────────────────────────────


@router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Log in with email and password",
    description="Starts a secure HTTP-only session cookie valid for 30 days.",
)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """Authenticate with email + password and start a session cookie."""
    account = db.query(Account).filter(Account.email == payload.email).first()
    if not account or not account.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_credentials", "message": "Invalid email or password."},
        )
    if not bcrypt.checkpw(payload.password.encode("utf-8"), account.password_hash.encode("utf-8")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "invalid_credentials", "message": "Invalid email or password."},
        )
    session_token = _create_session(str(account.id), db)
    db.commit()
    _set_session_cookie(response, session_token, request)
    logger.info("Login successful: email=%s account_id=%s", payload.email, account.id)
    return LoginResponse(account_id=str(account.id), email=account.email)


# ── POST /auth/logout ──────────────────────────────────────────────────────────


@router.post(
    "/auth/logout",
    response_model=LogoutResponse,
    summary="Log out and invalidate session",
    description="Deletes the server session and clears the session cookie.",
)
def logout(
    request: Request,
    response: Response,
    x_session_token: Optional[str] = Header(default=None),
    session_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
) -> LogoutResponse:
    """Delete the session identified by the header token."""
    token = session_token or x_session_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "missing_session", "message": "No session token provided."},
        )
    deleted = (
        db.query(AuthSession)
        .filter(AuthSession.session_token == token)
        .delete()
    )
    db.commit()
    _clear_session_cookie(response, request)
    if deleted:
        logger.info("Logout: session invalidated")
    return LogoutResponse(logged_out=True)


# ── POST /auth/keys/create ─────────────────────────────────────────────────────


@router.post(
    "/auth/keys/create",
    response_model=KeyCreateResponse,
    status_code=201,
    summary="Generate an additional API key",
    description=(
        "Create a new API key for the same account. "
        "Use separate keys per project — all keys share the same ops limit. "
        "The full key is shown ONCE."
    ),
)
def create_key(
    payload: KeyCreateRequest,
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
) -> KeyCreateResponse:
    """Generate a new API key for the authenticated account."""
    mode = payload.mode if payload.mode in ("live", "test") else "live"
    full_key, key_prefix, key_hash = generate_api_key(mode=mode)

    api_key_row = ApiKey(
        account_id=account.id,
        key_hash=key_hash,
        encrypted_key=encrypt_api_key(full_key),
        key_prefix=key_prefix,
        name=payload.name or "Default key",
    )
    db.add(api_key_row)
    db.commit()

    logger.info(
        "New key created: account_id=%s prefix=%s name=%s",
        account.id, key_prefix, api_key_row.name,
    )

    return KeyCreateResponse(
        api_key=full_key,
        key_prefix=key_prefix,
        name=api_key_row.name,
    )


# ── GET /auth/keys ─────────────────────────────────────────────────────────────


@router.get(
    "/auth/keys",
    response_model=KeyListResponse,
    summary="List all API keys for your account",
    description="Returns key prefix, name, and last-used timestamp. The full key is never returned.",
)
def list_keys(
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
) -> KeyListResponse:
    """List all keys for the authenticated account."""
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.account_id == account.id)
        .order_by(ApiKey.created_at)
        .all()
    )
    return KeyListResponse(
        keys=[KeyInfo.model_validate(k) for k in keys],
        total=len(keys),
    )


# ── DELETE /auth/keys/{key_prefix} ────────────────────────────────────────────


@router.delete(
    "/auth/keys/{key_prefix}",
    status_code=200,
    summary="Revoke an API key",
    description=(
        "Soft-deletes the key (sets is_active=False). "
        "You cannot delete your last active key."
    ),
)
def revoke_key(
    key_prefix: str,
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
) -> dict:
    """Revoke a key by its prefix. Preserves at least one active key."""
    target = (
        db.query(ApiKey)
        .filter(ApiKey.account_id == account.id, ApiKey.key_prefix == key_prefix)
        .first()
    )
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "key_not_found",
                "message": f"No key with prefix {key_prefix!r} found for your account.",
            },
        )

    # Prevent deleting the last active key
    active_count = (
        db.query(ApiKey)
        .filter(ApiKey.account_id == account.id, ApiKey.is_active.is_(True))
        .count()
    )
    if active_count <= 1 and target.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "cannot_delete_last_key",
                "message": (
                    "You cannot delete your last active API key. "
                    "Create a new key first, then delete this one."
                ),
            },
        )

    target.is_active = False
    db.commit()

    logger.info("Key revoked: account_id=%s prefix=%s", account.id, key_prefix)
    return {"revoked": True, "key_prefix": key_prefix}


# ── GET /auth/me ───────────────────────────────────────────────────────────────


@router.get(
    "/auth/me",
    response_model=AccountMeResponse,
    summary="Account info and usage",
    description="Returns your account details, current ops usage, and account API keys for authenticated dashboard management.",
)
def me(
    account: Account = Depends(get_current_account),
    db: Session = Depends(get_db),
) -> AccountMeResponse:
    """Return account info for the authenticated key."""
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.account_id == account.id)
        .order_by(ApiKey.created_at.desc())
        .all()
    )
    keys_count = sum(1 for key in keys if key.is_active)
    return AccountMeResponse(
        account_id=str(account.id),
        email=account.email,
        plan=account.plan,
        ops_used_this_month=account.ops_used or 0,
        ops_limit=account.ops_limit or 10000,
        credits=account.credits or 0,
        keys_count=keys_count,
        member_since=account.created_at.strftime("%Y-%m-%d") if account.created_at else "",
        keys=[
            AccountKeyInfo(
                id=str(key.id),
                key_prefix=key.key_prefix,
                key=decrypt_api_key(key.encrypted_key),
                name=key.name or "Default key",
                last_used_at=key.last_used_at,
                is_active=key.is_active,
                created_at=key.created_at,
                revealable=decrypt_api_key(key.encrypted_key) is not None,
            )
            for key in keys
        ],
    )
