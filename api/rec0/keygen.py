# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""API key generation and verification utilities for rec0."""

from __future__ import annotations

import secrets

import bcrypt


def generate_api_key(mode: str = "live") -> tuple[str, str, str]:
    """Generate a new API key.

    Returns:
        (full_key, key_prefix, key_hash)

        full_key   — shown to user ONCE, never stored
        key_prefix — stored in DB, shown in dashboard
        key_hash   — bcrypt hash stored in DB for verification
    """
    random_part = secrets.token_urlsafe(24)
    full_key = f"r0_{mode}_sk_{random_part}"
    key_prefix = full_key[:20] + "..."
    key_hash = bcrypt.hashpw(
        full_key.encode(),
        bcrypt.gensalt(rounds=12),
    ).decode()
    return full_key, key_prefix, key_hash


def check_api_key(plain_key: str, key_hash: str) -> bool:
    """Verify a plain key against its stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_key.encode(), key_hash.encode())
    except Exception:
        return False
