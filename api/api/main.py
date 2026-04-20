# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""rec0 API — production-grade memory infrastructure for LLM applications."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes.memory import router as memory_router
from api.routes.users import router as users_router
from api.routes.auth import router as auth_router
from rec0.database import Base, SessionLocal, engine
import rec0.models  # noqa: F401 — registers all models with Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_start_time = time.time()


# ── Schema migrations (add new columns safely) ─────────────────────────────────

def _migrate_schema() -> None:
    """Add new columns to existing tables if they don't exist yet.
    Safe to run repeatedly — errors from already-existing columns are swallowed.
    """
    from sqlalchemy import text

    new_columns = [
        "ALTER TABLE memories ADD COLUMN embedding TEXT",
        "ALTER TABLE memories ADD COLUMN recall_count INTEGER DEFAULT 0",
        "ALTER TABLE memories ADD COLUMN last_recalled_at TIMESTAMPTZ",
    ]
    with engine.connect() as conn:
        for stmt in new_columns:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                conn.rollback()  # column already exists — harmless


# ── Memory decay background task ───────────────────────────────────────────────

def _apply_decay() -> None:
    """Reduce importance of stale memories.

    Memories older than 30 days lose 10% importance per week.
    Runs hourly in a background asyncio task.
    """
    db = SessionLocal()
    try:
        from rec0.models import Memory
        from sqlalchemy import and_

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=30)
        stale = (
            db.query(Memory)
            .filter(
                Memory.is_active.is_(True),
                Memory.created_at < cutoff,
            )
            .all()
        )
        for mem in stale:
            weeks_old = max(0, (now - mem.created_at).days // 7 - 4)
            decay = 0.9 ** weeks_old
            mem.importance = max(0.01, round((mem.importance or 1.0) * decay, 4))
        if stale:
            db.commit()
            logger.info("Decay applied to %d memories", len(stale))
    except Exception as exc:
        logger.error("Decay task error: %s", exc)
    finally:
        db.close()


async def _decay_loop() -> None:
    """Run decay every hour."""
    while True:
        await asyncio.sleep(3600)
        await asyncio.get_event_loop().run_in_executor(None, _apply_decay)


# ── App lifespan ───────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    secret = os.environ.get("SECRET_KEY", "")
    if secret:
        logger.info("SECRET_KEY loaded: %s...", secret[:5])
    else:
        logger.warning("SECRET_KEY is NOT set — all API requests will be rejected!")

    try:
        Base.metadata.create_all(bind=engine)
        _migrate_schema()
        logger.info("Database tables ready.")
    except Exception as exc:
        logger.error("Could not initialise DB on startup: %s", exc)

    # Pre-warm the embedding model so the first user request is fast.
    # fastembed downloads ~130 MB ONNX model on first call (cached afterward).
    try:
        from rec0.embeddings import get_embedding_model
        get_embedding_model()
        logger.info("Embedding model warmed up")
    except Exception as exc:
        logger.warning("Embedding model pre-warm failed: %s", exc)

    decay_task = asyncio.create_task(_decay_loop())
    yield
    decay_task.cancel()


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="rec0 API",
    description=(
        "Production-grade memory infrastructure for LLM applications. "
        "Store, recall, and manage user memories with semantic search."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rec0.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://rec0.ai",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Ops-Used", "X-Ops-Limit"],
)

app.include_router(memory_router, prefix="/v1")
app.include_router(users_router, prefix="/v1")
app.include_router(auth_router, prefix="/v1")


# ── Global error handlers ──────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": str(exc.errors()),
            "docs": "https://docs.rec0.ai/errors",
        },
    )


# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/health", summary="Health check")
def health_check() -> dict:
    """Return service health status, DB connectivity, and uptime."""
    db_status = "unknown"
    try:
        db = SessionLocal()
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "connected"
    except Exception as exc:
        logger.error("Health check DB error: %s", exc)
        db_status = "error"

    return {
        "status": "ok",
        "version": "1.0.0",
        "db": db_status,
        "uptime_seconds": int(time.time() - _start_time),
        "embedding_model": "BAAI/bge-small-en-v1.5 (local, ONNX)",
        "embedding_dependency": "none",
    }
