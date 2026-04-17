# Copyright (c) 2026 Yash Patel / rec0.ai
# Licensed under MIT License
# https://github.com/patelyash2511/rec0/blob/main/LICENSE

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
REGISTER_LIMIT = 5    # registrations per hour per IP

_lock = threading.Lock()
_requests: Dict[str, List[datetime]] = defaultdict(list)


def check_rate_limit(key: str, limit: int = FREE_TIER_LIMIT) -> Tuple[bool, int]:
    """Check whether this key (api key or IP) is within the rate limit.

    Returns (allowed, retry_after_seconds).
    Allowed is False when the cap is exceeded.
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=1)

    with _lock:
        # Drop timestamps outside the rolling window
        _requests[key] = [t for t in _requests[key] if t > window_start]
        count = len(_requests[key])

        if count >= limit:
            # Retry after the oldest request in window falls off
            oldest = _requests[key][0]
            retry_after = max(1, int((oldest + timedelta(hours=1) - now).total_seconds()))
            return False, retry_after

        _requests[key].append(now)
        return True, 0
