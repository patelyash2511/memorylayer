# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

"""rec0 — privacy-first memory API for LLMs.

Quick start::

    from rec0 import Memory

    mem = Memory(api_key="r0_xxx", user_id="user_123")
    mem.store("User prefers dark mode and uses VSCode")
    context = mem.context("user preferences")
    # inject context into your LLM prompt — done
"""

from .async_client import AsyncMemory
from .client import Memory
from .exceptions import AuthError, NotFoundError, RateLimitError, Rec0Error, ServerError
from .models import MemoryObject, RecallResult
from .version import __version__

__all__ = [
    "Memory",
    "AsyncMemory",
    "MemoryObject",
    "RecallResult",
    "Rec0Error",
    "AuthError",
    "RateLimitError",
    "NotFoundError",
    "ServerError",
    "__version__",
]
