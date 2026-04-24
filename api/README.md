# MemoryLayer

> Give your LLM app a memory. Store, recall, and delete user memories with 3 lines of Python.

---

## What it does

LLMs forget everything between conversations. MemoryLayer fixes that.

You store facts about your users — preferences, context, history — and retrieve the most relevant ones before each LLM call. The result: personalised, context-aware responses without bloating your prompts.

```python
from memorylayer.client import Memory

client = Memory(api_key="your-key", app_id="your-app", base_url="https://your-server/v1")

client.store("user_123", "Prefers concise bullet-point answers")
client.store("user_123", "Building a SaaS for indie developers")

context = client.recall("user_123", "How should I respond to this user?")
# "Relevant memories:\n- Prefers concise bullet-point answers\n- Building a SaaS for indie developers"

# Inject `context` at the top of your LLM system prompt — done.
```

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/memory/store` | Save a memory for a user |
| `POST` | `/v1/memory/recall` | Get ranked relevant memories as a prompt-ready string |
| `GET` | `/v1/memory/list` | List all memories for a user |
| `DELETE` | `/v1/memory/{memory_id}` | Soft-delete a memory (privacy-safe) |
| `GET` | `/health` | Health check |

All endpoints (except `/health`) require the header: `X-API-Key: <your-secret-key>`

---

## Run locally in 3 steps

**1. Clone and install**
```bash
git clone https://github.com/patelyash2511/memorylayer.git
cd memorylayer
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

**2. Configure environment**
```bash
cp .env.example .env
# Edit .env — add your DATABASE_URL and SECRET_KEY
```

`.env` format:
```
DATABASE_URL=postgresql://postgres.[project]:[password]@[host]:6543/postgres
SECRET_KEY=your-secret-key
```

> For quick local testing, use `DATABASE_URL=sqlite:///./memorylayer.db`

**3. Start the server**
```bash
uvicorn main:app --reload
```

Server runs at `http://localhost:8000` — tables are created automatically on first start.

---

## Run tests

```bash
pytest tests/ -v
```

All 26 tests run against an in-memory SQLite database — no real database needed.

---

## Use the Python SDK

```python
from memorylayer.client import Memory

client = Memory(
    api_key="your-secret-key",
    app_id="my-app",
    base_url="http://localhost:8000/v1",
)

# Store memories
client.store("user_123", "Loves Python and hates long emails")

# Recall relevant memories (returns formatted string for LLM injection)
context = client.recall("user_123", "How should I write to this user?")
print(context)
# Relevant memories:
# - Loves Python and hates long emails

# List all memories for a user
memories = client.list("user_123")

# Delete a memory
client.delete(memory_id)
```

---

## Stack

- **API:** FastAPI + Python 3.11
- **Database:** PostgreSQL (Supabase) / SQLite for local dev
- **ORM:** SQLAlchemy
- **Ranking:** `difflib.SequenceMatcher` (semantic search coming in v0.2)
- **Auth:** API key via `X-API-Key` header

---

## Roadmap

- [ ] Semantic search with embeddings (sentence-transformers)
- [ ] Importance weighting in recall
- [ ] Multi-tenant API key management
- [ ] `pip install memorylayer` package release

---

## License

MIT

MemoryLayer is a persistent memory API for LLM apps. Developers store user memories and retrieve relevant ones per session.

## Overview

LLMs are stateless by default — they forget everything between conversations. MemoryLayer solves this by providing a REST API that your application calls to:

- **Store** memories for a user after each session
- **Retrieve** the most relevant memories at the start of a new session, injected into the LLM context

## Getting Started

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual DATABASE_URL and SECRET_KEY
```

### 3. Run the API

```bash
uvicorn main:app --reload
```

### 4. Health check

```
GET /health
→ {"status": "ok"}
```

## Running Tests

```bash
pytest tests/
```

## Project Structure

```
memorylayer/   # Core SDK logic
api/           # FastAPI route handlers
tests/         # pytest test files
```
