"""rec0 data models — clean dataclasses for API responses."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class MemoryObject:
    id: str
    user_id: str
    app_id: str
    content: str
    summary: Optional[str]
    importance: float
    recall_count: int
    created_at: datetime
    updated_at: datetime
    is_active: bool
    rec0_version: str
    relevance_score: Optional[float] = None  # only present on recall results

    @classmethod
    def _from_dict(cls, data: dict) -> "MemoryObject":
        return cls(
            id=data["id"],
            user_id=data["user_id"],
            app_id=data["app_id"],
            content=data["content"],
            summary=data.get("summary"),
            importance=float(data.get("importance", 1.0)),
            recall_count=int(data.get("recall_count", 0)),
            created_at=_parse_dt(data["created_at"]),
            updated_at=_parse_dt(data["updated_at"]),
            is_active=bool(data.get("is_active", True)),
            rec0_version=data.get("rec0_version", "1.0.0"),
            relevance_score=float(data["relevance_score"]) if "relevance_score" in data else None,
        )


@dataclass
class RecallResult:
    memories: List[MemoryObject]
    total_memories: int
    recall_time_ms: int
    rec0_version: str


def _parse_dt(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    # Handle ISO strings with or without timezone suffix
    value = value.rstrip("Z")
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse datetime: {value!r}")
