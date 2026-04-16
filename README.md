# rec0 — Memory API for LLMs

> Give your AI a permanent memory in 3 lines of code.

[![PyPI](https://img.shields.io/pypi/v/memorylayer-py)](https://pypi.org/project/memorylayer-py/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![API Status](https://img.shields.io/badge/API-Live-brightgreen)](https://memorylayer-production.up.railway.app/health)

rec0 is a **privacy-first, developer-first memory API** that gives any LLM
persistent, structured memory across sessions. One SDK. 3 lines of code.
Your AI remembers users forever.

---

## Why rec0?

|                   | rec0    | Mem0    | Supermemory | DIY        |
|-------------------|---------|---------|-------------|------------|
| Cost per 1K ops   | $0.002  | $0.10   | $0.10+      | varies     |
| Setup time        | 30 min  | 60 min  | Hours       | 6–8 weeks  |
| Memory decay      | ✅      | ❌      | ❌          | manual     |
| Privacy-first     | ✅      | ❌      | ❌          | manual     |
| GDPR built-in     | ✅      | partial | partial     | manual     |
| LLM-agnostic      | ✅      | partial | ✅          | ✅         |

---

## Quickstart

```bash
pip install memorylayer-py
```

```python
from rec0 import Memory

mem = Memory(api_key="r0_xxx", user_id="user_123")
mem.store("User prefers dark mode and uses VSCode")
context = mem.context("what does the user prefer")
# inject context into your LLM prompt — done
```

---

## API

**Base URL:** `https://memorylayer-production.up.railway.app`
*(moving to `https://api.rec0.ai` soon)*

**Auth:** `X-API-Key` header

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| POST | /v1/memory/store | Store a memory |
| POST | /v1/memory/recall | Semantic recall |
| GET | /v1/memory/list | List all memories |
| DELETE | /v1/memory/{id} | Delete a memory |
| DELETE | /v1/users/{user_id} | GDPR erasure |
| GET | /v1/users/{user_id}/export | GDPR export |

### Store
```bash
curl -X POST https://memorylayer-production.up.railway.app/v1/memory/store \
  -H "Content-Type: application/json" \
  -H "X-API-Key: r0_xxx" \
  -d '{"user_id":"user_123","app_id":"my_app","content":"User prefers dark mode"}'
```

### Recall
```bash
curl -X POST https://memorylayer-production.up.railway.app/v1/memory/recall \
  -H "Content-Type: application/json" \
  -H "X-API-Key: r0_xxx" \
  -d '{"user_id":"user_123","app_id":"my_app","query":"user preferences","limit":5}'
```

---

## SDK Reference

```python
from rec0 import Memory, AsyncMemory
from rec0.exceptions import Rec0Error, AuthError, RateLimitError

mem = Memory(
    api_key="r0_xxx",           # or set REC0_API_KEY env var
    user_id="user_123",
    app_id="my_app",            # optional, default: "default"
    base_url="https://api.rec0.ai"
)

mem.ping()                      # → True if connected
mem.store("some content")       # → MemoryObject
mem.recall("query", limit=5)    # → list[MemoryObject]
mem.context("query", limit=5)   # → str (ready for LLM prompt)
mem.list()                      # → list[MemoryObject]
mem.delete(memory_id)           # → None
mem.delete_user()               # → {"deleted": True, "memories_removed": N}
mem.export()                    # → dict (GDPR export)
```

### Async

```python
from rec0 import AsyncMemory

async def main():
    mem = AsyncMemory(api_key="r0_xxx", user_id="user_123")
    await mem.store("User loves Python")
    context = await mem.context("what does the user like")
```

---

## How It Works

1. **Store** — content is embedded locally using
   BAAI/bge-small-en-v1.5 (ONNX, no external APIs)
2. **Index** — 384-dim vectors stored in Supabase PostgreSQL
3. **Recall** — cosine similarity search returns ranked memories
4. **Decay** — memories age intelligently over time
5. **Privacy** — user data never leaves your infrastructure

---

## Privacy

rec0 is built privacy-first from day one:

- Embeddings generated **locally** using ONNX model
- **Zero external API calls** for embeddings or summaries
- User memory content **never sent** to OpenAI or any third party
- GDPR Article 17 (erasure): `DELETE /v1/users/{user_id}`
- GDPR Article 20 (portability): `GET /v1/users/{user_id}/export`

---

## Stack

| Layer      | Technology                            |
|------------|---------------------------------------|
| API        | FastAPI (Python)                      |
| Database   | Supabase (PostgreSQL)                 |
| Hosting    | Railway                               |
| Embeddings | BAAI/bge-small-en-v1.5 (ONNX, local) |
| SDK        | Python (memorylayer-py on PyPI)       |

---

## Project Structure

```
rec0/
├── api/          # FastAPI backend
├── sdk/          # Python SDK (memorylayer-py on PyPI)
├── website/      # Landing page
└── README.md
```

---

## Roadmap

- [ ] Custom domain → api.rec0.ai
- [ ] JavaScript / Node.js SDK
- [ ] LangChain + LlamaIndex integrations
- [ ] Memory Analytics dashboard
- [ ] PageIndex integration for document memory

---

## License

MIT © 2026 rec0.ai — Built by Yash

---

*rec0 — remember everything, forget nothing*
