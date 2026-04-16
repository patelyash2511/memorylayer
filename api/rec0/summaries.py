"""Summary generation for rec0.

Pure-Python extractive summariser — fast, deterministic, and 100% private.
No external API call. No user memory content leaves rec0 servers.
"""

from __future__ import annotations


def generate_summary(content: str) -> str:
    """Return a concise extractive summary of the memory content.

    Strategy:
      1. If content is already short (<= 100 chars), return it verbatim.
      2. Try to end at the first sentence boundary within 150 chars.
      3. Fall back to clean word-boundary truncation at 100 chars.
    """
    content = content.strip()
    if len(content) <= 100:
        return content
    for punct in [". ", "! ", "? "]:
        idx = content.find(punct)
        if 0 < idx <= 150:
            return content[: idx + 1]
    truncated = content[:100]
    last_space = truncated.rfind(" ")
    return (truncated[:last_space] + "...") if last_space > 50 else truncated + "..."
