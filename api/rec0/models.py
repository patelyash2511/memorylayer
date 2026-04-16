import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Index, Integer, String, Text

from rec0.database import Base


class Memory(Base):
    __tablename__ = "memories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    app_id = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    importance = Column(Float, default=1.0, nullable=False)
    # JSON-encoded embedding vector (set at store time via fastembed ONNX local model)
    embedding = Column(Text, nullable=True)
    recall_count = Column(Integer, default=0, nullable=False)
    last_recalled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("ix_memories_user_id", "user_id"),
        Index("ix_memories_app_id", "app_id"),
    )
