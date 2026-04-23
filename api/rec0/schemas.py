# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

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


# ── Auth schemas ───────────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: str
    name: Optional[str] = None
    password: str

    @field_validator("email")
    @classmethod
    def email_not_empty(cls, v: str) -> str:
        if not v or "@" not in v:
            raise ValueError("A valid email address is required")
        return v.lower().strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class RegisterResponse(BaseModel):
    account_id: str
    email: str
    plan: str
    api_key: str
    key_prefix: str
    warning: str = "Save this key now. You can reveal it later from the dashboard while signed in."
    docs: str = "https://docs.rec0.ai/quickstart"


class KeyCreateRequest(BaseModel):
    name: str = "Default key"
    mode: str = "live"


class KeyCreateResponse(BaseModel):
    api_key: str
    key_prefix: str
    name: str
    warning: str = "Save this key now. You can reveal it later from the dashboard while signed in."


class KeyInfo(BaseModel):
    key_prefix: str
    name: str
    last_used_at: Optional[datetime]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class KeyListResponse(BaseModel):
    keys: List[KeyInfo]
    total: int


class AccountKeyInfo(BaseModel):
    id: str
    key_prefix: str
    key: Optional[str] = None
    name: str
    last_used_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    revealable: bool = False

    model_config = {"from_attributes": True}


class AccountMeResponse(BaseModel):
    account_id: str
    email: str
    plan: str
    ops_used_this_month: int
    ops_limit: int
    credits: int
    keys_count: int
    member_since: str
    keys: List[AccountKeyInfo] = []


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_not_empty(cls, v: str) -> str:
        if not v or "@" not in v:
            raise ValueError("A valid email address is required")
        return v.lower().strip()


class LoginResponse(BaseModel):
    account_id: str
    email: str


class LogoutResponse(BaseModel):
    logged_out: bool

