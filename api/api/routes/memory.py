# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""Memory endpoints for rec0 API.

Endpoints:
  POST /memory/store       — store a memory (generates embedding + summary)
  POST /memory/recall      — semantic recall with importance boost
  GET  /memory/list        — list all active memories for a user
  DELETE /memory/{id}      — soft-delete a memory (GDPR-friendly)
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from difflib import SequenceMatcher
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from rec0.database import get_db
from rec0.embeddings import compute_similarity, embed
from rec0.keygen import check_api_key
from rec0.models import Account, ApiKey, Memory, UsageLog
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


def verify_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> str:
    """Verify X-API-Key using DB-backed tenant keys only."""
    if not x_api_key:
        raise _auth_error()

    prefix = x_api_key[:20] + "..." if len(x_api_key) >= 20 else x_api_key
    candidates = (
        db.query(ApiKey)
        .filter(ApiKey.key_prefix == prefix, ApiKey.is_active.is_(True))
        .all()
    )

    key_record: Optional[ApiKey] = None
    for candidate in candidates:
        if check_api_key(x_api_key, candidate.key_hash):
            key_record = candidate
            break

    if not key_record:
        raise _auth_error()

    account = db.query(Account).filter(Account.id == key_record.account_id).first()
    if not account:
        raise _auth_error()

    key_record.last_used_at = datetime.now(timezone.utc)
    db.flush()

    request.state.account = account
    request.state.account_id = str(account.id)
    request.state.key_prefix = key_record.key_prefix

    return str(key_record.account_id)


def _check_rate(account_id: str) -> None:
    """Raise 429 if the account has exceeded the hourly rate limit."""
    allowed, retry_after = check_rate_limit(account_id)
    if not allowed:
        raise _rate_limit_error(retry_after)


def _get_account_scope_id(request: Request) -> str:
    account_id = getattr(request.state, "account_id", None)
    if account_id:
        return str(account_id)
    raise _auth_error()


def _track_op(request: Request, db: Session) -> None:
    """Increment ops_used and write a usage log for DB-authenticated requests.

    Only counts /memory/store and /memory/recall as ops (per FAQ).
    No-ops for legacy/dev key users (no account attached).
    Commits immediately so ops are recorded even on early returns.
    """
    account: Optional[Account] = getattr(request.state, "account", None)
    if account is None:
        return

    if (account.ops_used or 0) >= (account.ops_limit or 10000):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "ops_limit_exceeded",
                "message": (
                    f"You have used all {account.ops_limit:,} ops this month. "
                    "Upgrade or buy credits."
                ),
                "ops_used": account.ops_used,
                "ops_limit": account.ops_limit,
                "upgrade_url": "https://rec0.ai/#pricing",
            },
        )

    account.ops_used = (account.ops_used or 0) + 1
    log = UsageLog(
        account_id=account.id,
        key_prefix=getattr(request.state, "key_prefix", None),
        endpoint=str(request.url.path),
    )
    db.add(log)
    db.commit()  # commit immediately so ops are recorded even on early return


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
    request: Request,
    db: Session = Depends(get_db),
    account_id: str = Depends(verify_api_key),
) -> Memory:
    """Store a memory with auto-generated embedding and summary."""
    _check_rate(account_id)
    _track_op(request, db)
    account_scope_id = _get_account_scope_id(request)

    emb = embed(payload.content)
    emb_json = json.dumps(emb) if emb is not None else None
    summary = generate_summary(payload.content)

    memory = Memory(
        account_id=account_scope_id,
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
    request: Request,
    db: Session = Depends(get_db),
    account_id: str = Depends(verify_api_key),
) -> RecallListResponse:
    """Semantic recall using fastembed ONNX local model (BAAI/bge-small-en-v1.5). No external APIs."""
    _check_rate(account_id)
    _track_op(request, db)
    account_scope_id = _get_account_scope_id(request)
    t_start = time.monotonic()

    memories = (
        db.query(Memory)
        .filter(
            Memory.account_id == account_scope_id,
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
    request: Request,
    user_id: str = Query(...),
    app_id: Optional[str] = Query(default=None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    account_id: str = Depends(verify_api_key),
) -> MemoryListResponse:
    """List all active memories for a user."""
    _check_rate(account_id)
    account_scope_id = _get_account_scope_id(request)

    query = db.query(Memory).filter(
        Memory.account_id == account_scope_id,
        Memory.user_id == user_id,
        Memory.is_active.is_(True),
    )
    if app_id:
        query = query.filter(Memory.app_id == app_id)

    total = query.count()
    memories = query.order_by(Memory.created_at).offset(offset).limit(limit).all()

    return MemoryListResponse(
        memories=memories,
        total_memories=total,
        limit=limit,
        offset=offset,
    )


@router.delete(
    "/memory/{memory_id}",
    status_code=204,
    summary="Soft-delete a memory",
    description="Mark a memory as inactive. Row retained for audit trail.",
)
def delete_memory(
    memory_id: str,
    request: Request,
    db: Session = Depends(get_db),
    account_id: str = Depends(verify_api_key),
) -> None:
    """Soft-delete a memory by ID (sets is_active=False)."""
    _check_rate(account_id)
    account_scope_id = _get_account_scope_id(request)

    memory = (
        db.query(Memory)
        .filter(
            Memory.id == memory_id,
            Memory.account_id == account_scope_id,
            Memory.is_active.is_(True),
        )
        .first()
    )
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

