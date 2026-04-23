# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

from rec0.models import Memory
from rec0.schemas import MemoryCreate, MemoryResponse, MemoryQuery
from rec0.database import Base, get_db


def test_models_import():
    assert Memory.__tablename__ == "memories"


def test_memory_create_schema():
    m = MemoryCreate(user_id="u1", app_id="app1", content="Remember this.")
    assert m.user_id == "u1"
    assert m.app_id == "app1"
    assert m.content == "Remember this."


def test_memory_query_schema_defaults():
    q = MemoryQuery(user_id="u1", app_id="app1", query="what did I say?")
    assert q.limit == 10
    assert q.offset == 0


def test_database_exports():
    assert Base is not None
    assert callable(get_db)
