"""In-memory rate limiter for rec0.

Free tier: 100 requests per rolling hour per API key.
Returns (allowed: bool, retry_after_seconds: int).
"""

from __future__ import annotations

import threading
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

FREE_TIER_LIMIT = 100  # requests per hour

_lock = threading.Lock()
_requests: Dict[str, List[datetime]] = defaultdict(list)


def check_rate_limit(api_key: str) -> Tuple[bool, int]:
    """Check whether this API key is within the rate limit.

    Returns (allowed, retry_after_seconds).
    Allowed is False when the hourly cap is exceeded.
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=1)

    with _lock:
        # Drop timestamps outside the rolling window
        _requests[api_key] = [t for t in _requests[api_key] if t > window_start]
        count = len(_requests[api_key])

        if count >= FREE_TIER_LIMIT:
            # Retry after the oldest request in window falls off
            oldest = _requests[api_key][0]
            retry_after = max(1, int((oldest + timedelta(hours=1) - now).total_seconds()))
            return False, retry_after

        _requests[api_key].append(now)
        return True, 0
