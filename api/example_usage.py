# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

from rec0.client import Memory

# Initialise the SDK — point it at your running rec0 server
client = Memory(
    api_key="memorylayer-dev-key-2026",
    app_id="demo-app",
    base_url="http://localhost:8000/v1",
)

USER = "user_123"

# ── Store some memories ────────────────────────────────────────────────────────
client.store(USER, "I prefer concise, bullet-point answers over long paragraphs.")
client.store(USER, "My favourite programming language is Python.")
client.store(USER, "I am building a SaaS product targeted at indie developers.")

print("Stored 3 memories for", USER)

# ── Recall memories relevant to an upcoming LLM prompt ────────────────────────
query = "What does the user like about communication style?"
context = client.recall(USER, query, limit=3)

print("\n── LLM prompt context ─────────────────────────────────────────────────")
print(context)
print()
print("── Full prompt sent to LLM ────────────────────────────────────────────")
print(f"{context}\n\nUser: {query}\nAssistant:")
