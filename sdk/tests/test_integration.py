# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""Integration tests — run against the live rec0 API.

Skipped entirely when REC0_API_KEY is not set in the environment.

Run with:
    REC0_API_KEY=r0_dev_key_2026 pytest tests/test_integration.py -v
"""

from __future__ import annotations

import os
import time
import pytest

REC0_API_KEY = os.environ.get("REC0_API_KEY", "")
BASE_URL = os.environ.get(
    "REC0_BASE_URL", "https://memorylayer-production.up.railway.app"
)

pytestmark = pytest.mark.skipif(
    not REC0_API_KEY,
    reason="REC0_API_KEY not set — skipping integration tests",
)


@pytest.fixture(scope="module")
def mem():
    from rec0 import Memory
    client = Memory(
        api_key=REC0_API_KEY,
        user_id="sdk_inttest_user",
        app_id="rec0_sdk_test",
        base_url=BASE_URL,
    )
    yield client
    # Cleanup — remove all test memories after the module finishes
    try:
        client.delete_user()
    except Exception:
        pass


def test_ping_returns_true(mem):
    assert mem.ping() is True


def test_full_store_recall_delete_cycle(mem):
    # Store
    stored = mem.store(
        "The user is building a privacy-first memory API called rec0 using Python and FastAPI"
    )
    assert stored.id
    assert stored.content.startswith("The user")

    # Recall — top result should be the memory we just stored
    memories = mem.recall("what is the user building", limit=3)
    assert len(memories) >= 1
    ids = [m.id for m in memories]
    assert stored.id in ids

    # Relevance score present
    top = memories[0]
    assert top.relevance_score is not None
    assert 0.0 <= top.relevance_score <= 1.0

    # Delete it
    mem.delete(stored.id)

    # Confirm deleted — should no longer appear in list
    time.sleep(0.5)  # give server a moment
    all_memories = mem.list()
    remaining_ids = [m.id for m in all_memories]
    assert stored.id not in remaining_ids


def test_context_string_format(mem):
    mem.store("The user prefers Python over JavaScript")
    time.sleep(0.3)

    ctx = mem.context("programming language preference", limit=3)
    if ctx:
        lines = ctx.split("\n")
        for line in lines:
            assert line.startswith("- "), f"Expected '- ' prefix, got: {line!r}"


def test_export_returns_user_data(mem):
    mem.store("Integration test memory for export")
    time.sleep(0.3)

    data = mem.export()
    assert "memories" in data
    assert isinstance(data["memories"], list)
