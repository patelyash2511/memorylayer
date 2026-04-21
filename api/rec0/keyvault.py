from __future__ import annotations

import os
from base64 import urlsafe_b64encode
from hashlib import sha256

from cryptography.fernet import Fernet, InvalidToken


def _get_fernet() -> Fernet | None:
    secret = os.environ.get("SECRET_KEY", "").strip()
    if not secret:
        return None
    derived_key = urlsafe_b64encode(sha256(secret.encode("utf-8")).digest())
    return Fernet(derived_key)


def encrypt_api_key(plain_key: str) -> str | None:
    fernet = _get_fernet()
    if not fernet:
        return None
    return fernet.encrypt(plain_key.encode("utf-8")).decode("utf-8")


def decrypt_api_key(ciphertext: str | None) -> str | None:
    if not ciphertext:
        return None
    fernet = _get_fernet()
    if not fernet:
        return None
    try:
        return fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        return None