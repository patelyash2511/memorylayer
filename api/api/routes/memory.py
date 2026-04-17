# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""Memory endpoints for rec0 API.

Endpoints:
  POST /memory/store       — store a memory (generates embedding + summary)
  POST /memory/recall      — semantic recall with importance boost
  GET  /memory/list        — list all active memories for a user
  DELETE /memory/{id}      — soft-delete a memory (GDPR-friendly)
  POST /auth/keygen        — generate a new r0_ API key with bcrypt hash
"""

from __future__ import annotations

import json
import logging
import os
import secrets
import time
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from rec0.database import get_db
from rec0.embeddings import compute_similarity, embed
from rec0.models import Memory
from rec0.ratelimit import check_rate_limit
from rec0.schemas import (
    MemoryCreate,
    MemoryListResponse,
    MemoryQuery,
    MemoryRecallResponse,
    MemoryResponse,
    RecallListResponse,
)
from rec0.summaries import generate_summary

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Auth helpers ───────────────────────────────────────────────────────────────

def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": "invalid_api_key",
            "message": "Invalid or missing API key",
            "docs": "https://docs.rec0.ai/errors",
        },
    )


def _rate_limit_error(retry_after: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "error": "rate_limit_exceeded",
            "message": f"Free tier limit exceeded. Retry after {retry_after} seconds.",
            "retry_after_seconds": retry_after,
            "docs": "https://docs.rec0.ai/errors",
        },
    )


def verify_api_key(x_api_key: Optional[str] = Header(default=None)) -> str:
    """Verify the X-API-Key header.

    Supports bcrypt hash validation (SECRET_KEY_HASH env var — recommended for
    production) and plaintext fallback (SECRET_KEY env var — backward compat).
    Returns the key on success for downstream rate limiting.
    """
    if not x_api_key:
        raise _auth_error()

    # Preferred: bcrypt hash validation
    key_hash = os.environ.get("SECRET_KEY_HASH", "")
    if key_hash:
        try:
            import bcrypt
            if not bcrypt.checkpw(x_api_key.encode(), key_hash.encode()):
                raise _auth_error()
            return x_api_key
        except ImportError:
            logger.error("bcrypt not installed but SECRET_KEY_HASH is set")
            raise _auth_error()

    # Fallback: plaintext comparison
    secret = os.environ.get("SECRET_KEY", "")
    if not secret or x_api_key != secret:
        raise _auth_error()
    logger.warning("Using plaintext SECRET_KEY. Set SECRET_KEY_HASH for production security.")
    return x_api_key


def _check_rate(api_key: str) -> None:
    """Raise 429 if the API key has exceeded the hourly rate limit."""
    allowed, retry_after = check_rate_limit(api_key)
    if not allowed:
        raise _rate_limit_error(retry_after)


# ── Endpoints ──────────────────────────────────────────────────────────────────


@router.post(
    "/memory/store",
    response_model=MemoryResponse,
    status_code=201,
    summary="Store a memory",
    description="Persist a new memory. Auto-generates embedding and summary.",
)
def store_memory(
    payload: MemoryCreate,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
) -> Memory:
    """Store a memory with auto-generated embedding and summary."""
    _check_rate(api_key)

    emb = embed(payload.content)
    emb_json = json.dumps(emb) if emb is not None else None
    summary = generate_summary(payload.content)

    memory = Memory(
        user_id=payload.user_id,
        app_id=payload.app_id,
        content=payload.content,
        summary=summary,
        embedding=emb_json,
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)

    logger.info("Memory stored: id=%s user_id=%s", memory.id, memory.user_id)
    return memory


@router.post(
    "/memory/recall",
    response_model=RecallListResponse,
    summary="Recall relevant memories",
    description="Return the most relevant memories ranked by semantic similarity.",
)
def recall_memories(
    payload: MemoryQuery,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
) -> RecallListResponse:
    """Semantic recall using fastembed ONNX local model (BAAI/bge-small-en-v1.5). No external APIs."""
    _check_rate(api_key)
    t_start = time.monotonic()

    memories = (
        db.query(Memory)
        .filter(
            Memory.user_id == payload.user_id,
            Memory.app_id == payload.app_id,
            Memory.is_active.is_(True),
        )
        .all()
    )

    total = len(memories)

    if not memories:
        return RecallListResponse(
            memories=[],
            total_memories=0,
            recall_time_ms=int((time.monotonic() - t_start) * 1000),
        )

    query_emb = embed(payload.query)

    scored = sorted(
        [
            (m, compute_similarity(payload.query, m.content, query_emb, m.embedding))
            for m in memories
        ],
        key=lambda x: x[1],
        reverse=True,
    )

    results: List[MemoryRecallResponse] = []
    accepted: List[str] = []
    to_boost: List[Memory] = []

    for mem, score in scored:
        if len(results) >= payload.limit:
            break
        is_duplicate = any(
            SequenceMatcher(None, mem.content.lower(), seen.lower()).ratio() > 0.95
            for seen in accepted
        )
        if is_duplicate:
            continue
        accepted.append(mem.content)
        to_boost.append(mem)
        results.append(
            MemoryRecallResponse(
                id=mem.id,
                user_id=mem.user_id,
                app_id=mem.app_id,
                content=mem.content,
                summary=mem.summary,
                importance=round(mem.importance, 2),
                recall_count=mem.recall_count or 0,
                created_at=mem.created_at,
                updated_at=mem.updated_at,
                is_active=mem.is_active,
                relevance_score=round(score, 2),
            )
        )

    # Boost importance and recall count for returned memories
    now = datetime.now(timezone.utc)
    for mem in to_boost:
        mem.importance = round(min((mem.importance or 1.0) + 0.1, 10.0), 2)
        mem.recall_count = (mem.recall_count or 0) + 1
        mem.last_recalled_at = now
    if to_boost:
        db.commit()

    recall_ms = int((time.monotonic() - t_start) * 1000)
    logger.info("Recall: user_id=%s results=%d ms=%d", payload.user_id, len(results), recall_ms)

    return RecallListResponse(
        memories=results,
        total_memories=total,
        recall_time_ms=recall_ms,
    )


@router.get(
    "/memory/list",
    response_model=MemoryListResponse,
    summary="List all memories",
    description="Return all active memories for a user in chronological order.",
)
def list_memories(
    user_id: str = Query(...),
    app_id: str = Query(...),
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
) -> MemoryListResponse:
    """List all active memories for a user."""
    _check_rate(api_key)

    memories = (
        db.query(Memory)
        .filter(
            Memory.user_id == user_id,
            Memory.app_id == app_id,
            Memory.is_active.is_(True),
        )
        .order_by(Memory.created_at)
        .all()
    )

    return MemoryListResponse(memories=memories, total_memories=len(memories))


@router.delete(
    "/memory/{memory_id}",
    status_code=204,
    summary="Soft-delete a memory",
    description="Mark a memory as inactive. Row retained for audit trail.",
)
def delete_memory(
    memory_id: str,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key),
) -> None:
    """Soft-delete a memory by ID (sets is_active=False)."""
    _check_rate(api_key)

    memory = db.query(Memory).filter(Memory.id == memory_id).first()
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "memory_not_found",
                "message": f"No memory with id={memory_id}",
                "docs": "https://docs.rec0.ai/errors",
            },
        )
    memory.is_active = False
    db.commit()
    logger.info("Memory soft-deleted: id=%s", memory_id)


# ── Auth utility endpoint ──────────────────────────────────────────────────────


@router.post(
    "/auth/keygen",
    summary="Generate a new API key",
    description=(
        "Generate a new r0_ API key and its bcrypt hash. "
        "Store the hash as SECRET_KEY_HASH in Railway env vars."
    ),
)
def generate_key(api_key: str = Depends(verify_api_key)) -> dict:
    """Generate a new r0_ API key with its bcrypt hash for production use."""
    try:
        import bcrypt
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "bcrypt_unavailable",
                "message": "Install bcrypt to use keygen",
                "docs": "https://docs.rec0.ai/errors",
            },
        )
    new_key = "r0_" + secrets.token_urlsafe(32)
    key_hash = bcrypt.hashpw(new_key.encode(), bcrypt.gensalt()).decode()
    return {
        "api_key": new_key,
        "secret_key_hash": key_hash,
        "instructions": (
            "Set SECRET_KEY_HASH=<secret_key_hash> in Railway env vars. "
            "Use api_key in your X-API-Key header."
        ),
        "rec0_version": "1.0.0",
    }
