from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator

REC0_VERSION = "1.0.0"


class MemoryCreate(BaseModel):
    user_id: str
    app_id: str
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty_or_too_long(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("content must not be empty")
        if len(v) > 2000:
            raise ValueError("content must not exceed 2000 characters")
        return v


class MemoryResponse(BaseModel):
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
    rec0_version: str = REC0_VERSION

    model_config = {"from_attributes": True}


class MemoryRecallResponse(MemoryResponse):
    relevance_score: float


class MemoryQuery(BaseModel):
    user_id: str
    app_id: str
    query: str
    limit: int = 5


class RecallListResponse(BaseModel):
    memories: List[MemoryRecallResponse]
    total_memories: int
    recall_time_ms: int
    rec0_version: str = REC0_VERSION


class MemoryListResponse(BaseModel):
    memories: List[MemoryResponse]
    total_memories: int
    rec0_version: str = REC0_VERSION


class ErrorResponse(BaseModel):
    error: str
    message: str
    docs: str = "https://docs.rec0.ai/errors"


class UserExportResponse(BaseModel):
    user_id: str
    app_id: Optional[str]
    total_memories: int
    memories: List[MemoryResponse]
    rec0_version: str = REC0_VERSION


class UserDeleteResponse(BaseModel):
    deleted: bool
    memories_removed: int
    rec0_version: str = REC0_VERSION
