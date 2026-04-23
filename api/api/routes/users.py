# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""GDPR-compliant user endpoints for rec0.

Endpoints:
  DELETE /users/{user_id} — hard delete ALL memories for a user
  GET    /users/{user_id}/export — export all memories (GDPR Article 20)
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from rec0.database import get_db
from rec0.models import Memory
from rec0.schemas import UserDeleteResponse, UserExportResponse
from api.routes.memory import _check_rate, _get_account_scope_id, verify_api_key

logger = logging.getLogger(__name__)

router = APIRouter()


@router.delete(
    "/users/{user_id}",
    response_model=UserDeleteResponse,
    summary="Hard-delete all memories for a user (GDPR erasure)",
    description=(
        "Permanently removes ALL memory rows for the user across all apps. "
        "Use app_id query param to scope erasure to a single app."
    ),
)
def delete_user(
    user_id: str,
    request: Request,
    app_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    account_id: str = Depends(verify_api_key),
) -> UserDeleteResponse:
    """Soft-delete all memories for a user (GDPR right to erasure)."""
    _check_rate(account_id)
    account_scope_id = _get_account_scope_id(request)

    query = db.query(Memory).filter(
        Memory.account_id == account_scope_id,
        Memory.user_id == user_id,
        Memory.is_active.is_(True),
    )
    if app_id:
        query = query.filter(Memory.app_id == app_id)

    count = query.count()
    query.update({"is_active": False}, synchronize_session=False)
    db.commit()

    logger.info("GDPR erasure: user_id=%s app_id=%s removed=%d", user_id, app_id, count)
    return UserDeleteResponse(deleted=True, memories_removed=count)


@router.get(
    "/users/{user_id}/export",
    response_model=UserExportResponse,
    summary="Export all memories for a user (GDPR portability)",
    description="Return all active memories for a user as JSON (GDPR Article 20 data portability).",
)
def export_user(
    user_id: str,
    request: Request,
    app_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    account_id: str = Depends(verify_api_key),
) -> UserExportResponse:
    """Export all memories for a user in portable JSON format."""
    _check_rate(account_id)
    account_scope_id = _get_account_scope_id(request)

    query = db.query(Memory).filter(
        Memory.account_id == account_scope_id,
        Memory.user_id == user_id,
        Memory.is_active.is_(True),
    )
    if app_id:
        query = query.filter(Memory.app_id == app_id)

    memories = query.order_by(Memory.created_at).all()

    logger.info("GDPR export: user_id=%s app_id=%s count=%d", user_id, app_id, len(memories))
    return UserExportResponse(
        user_id=user_id,
        app_id=app_id,
        total_memories=len(memories),
        memories=memories,
    )
