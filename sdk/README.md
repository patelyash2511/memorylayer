# rec0 — memory for any LLM

> Give your AI a permanent memory in 3 lines of code.

[![PyPI version](https://img.shields.io/pypi/v/rec0.svg)](https://pypi.org/project/rec0/)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Install

```bash
pip install rec0
```

## Quickstart

```python
from rec0 import Memory

mem = Memory(api_key="r0_xxx", user_id="user_123")
mem.store("User prefers Python and dark mode")
context = mem.context("user preferences")
# inject context into your LLM prompt — done
```

That's it. `context` returns a bullet-list string ready to prepend to any system prompt.

---

## Why rec0

| | rec0 | Mem0 |
|---|---|---|
| **Privacy** | Data never leaves your servers | Processed externally |
| **Cost** | $0.002 / 1K ops | ~$0.10 / 1K ops |
| **Setup** | 3 lines | OAuth + config |
| **LLM support** | Any model | OpenAI-first |
| **GDPR** | 1 API call | Manual |

- **Privacy-first:** embeddings and summaries run on YOUR infrastructure — no user data touches third-party APIs
- **LLM-agnostic:** works with OpenAI, Anthropic, Gemini, Llama, Mistral — anything that takes a string
- **Memory lifecycle:** automatic importance scoring, recall-count boosting, and time-based decay
- **GDPR compliant:** right-to-erasure in one call (`mem.delete_user()`)

---

## Full API reference

### `Memory(user_id, api_key, app_id, base_url)`

| Parameter | Type | Default | Description |
|---|---|---|---|
| `user_id` | `str` | required | Your end-user identifier |
| `api_key` | `str` | `$REC0_API_KEY` | Your rec0 API key |
| `app_id` | `str` | `"default"` | Namespace for multi-app isolation |
| `base_url` | `str` | prod URL | Override for self-hosting |

### Methods

#### `mem.store(content)` → `MemoryObject`
Store a new memory. Auto-generates embedding and summary server-side.

```python
m = mem.store("User is building a SaaS product in Python")
print(m.id)          # UUID
print(m.importance)  # starts at 1.0, increases with each recall
```

#### `mem.context(query, limit=5)` → `str`
**The most-used method.** Returns a bullet-list string to inject into your LLM prompt.

```python
context = mem.context("what does the user like", limit=5)
# "- User prefers Python and dark mode\n- User is building a SaaS product"

# Typical usage with OpenAI:
messages = [
    {"role": "system", "content": f"User context:\n{context}"},
    {"role": "user", "content": user_message},
]
```

#### `mem.recall(query, limit=5)` → `List[MemoryObject]`
Returns memories ranked by semantic similarity. Use when you need scores or metadata.

```python
memories = mem.recall("programming preferences", limit=3)
for m in memories:
    print(f"{m.content}  (score: {m.relevance_score})")
```

#### `mem.list()` → `List[MemoryObject]`
All active memories for this user, ordered by creation time.

#### `mem.delete(memory_id)` → `None`
Soft-delete a specific memory (retained for audit trail).

#### `mem.delete_user()` → `dict`
GDPR right-to-erasure. Removes all memories for this user.

#### `mem.export()` → `dict`
GDPR data export. Returns all memory data as a dictionary.

#### `mem.ping()` → `bool`
Connectivity check. Returns `True` if the API is reachable.

```python
if not mem.ping():
    print("rec0 API unreachable — check your key")
```

---

## Error handling

```python
from rec0 import Memory, Rec0Error, AuthError, RateLimitError, NotFoundError

mem = Memory(api_key="r0_xxx", user_id="user_123")

try:
    mem.store("User loves rec0")
except AuthError:
    print("Invalid API key — check REC0_API_KEY")
except RateLimitError as e:
    print(f"Rate limited — retry in {e.retry_after}s")
except NotFoundError:
    print("Memory not found")
except Rec0Error as e:
    print(f"Unexpected error: {e}")
```

Rate limits are handled automatically: rec0 will wait `retry_after` seconds and retry once before raising.

---

## Async usage

Every method has an async equivalent via `AsyncMemory`:

```python
import asyncio
from rec0 import AsyncMemory

async def main():
    mem = AsyncMemory(api_key="r0_xxx", user_id="user_123")
    await mem.store("User is a night-owl developer")
    context = await mem.context("when does the user work")
    print(context)

asyncio.run(main())
```

`AsyncMemory` uses `httpx` under the hood and is safe to use in FastAPI, Django async views, and any `asyncio` application.

---

## Environment variables

| Variable | Description |
|---|---|
| `REC0_API_KEY` | Your rec0 API key (used automatically if `api_key=` not passed) |
| `REC0_BASE_URL` | Override the API base URL (optional, for self-hosting) |

```bash
export REC0_API_KEY=r0_your_key_here
```

```python
# api_key is now auto-loaded — no need to hardcode it
mem = Memory(user_id="user_123")
```

---

## MemoryObject fields

| Field | Type | Description |
|---|---|---|
| `id` | `str` | UUID |
| `content` | `str` | The original memory text |
| `summary` | `str \| None` | Auto-generated summary |
| `importance` | `float` | 1.0–10.0; increases with recall |
| `recall_count` | `int` | Times this memory was recalled |
| `relevance_score` | `float \| None` | Similarity score (recall only) |
| `created_at` | `datetime` | When stored |
| `is_active` | `bool` | False if deleted |

---

## Self-hosting

rec0 is open-source. Deploy your own instance on Railway, Fly, or any server:

```bash
git clone https://github.com/patelyash2511/memorylayer
# See README for Railway deployment instructions
```

Then point the SDK at your instance:

```python
mem = Memory(
    api_key="your_key",
    user_id="user_123",
    base_url="https://your-instance.up.railway.app",
)
```

---

[rec0.ai](https://rec0.ai) · [docs](https://docs.rec0.ai) · [discord](https://discord.gg/rec0) · [twitter](https://twitter.com/rec0ai)
