
import time
import threading
from collections import deque, defaultdict
from fastapi import HTTPException

class InMemoryRateLimiter:
    """
    A simple in-memory rate limiter using a sliding window of timestamps.
    Thread-safe.
    """
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Dictionary mapping user_id to a deque of timestamps
        self.user_requests = defaultdict(deque)
        self.lock = threading.Lock()

    async def check_limit(self, user_id: str):
        """
        Checks if the user has exceeded the rate limit.
        Raises HTTPException(429) if limit exceeded.
        """
        with self.lock:
            now = time.time()
            user_history = self.user_requests[user_id]
            
            # Remove timestamps outside the window
            while user_history and user_history[0] < now - self.window_seconds:
                user_history.popleft()
            
            # Check current count
            if len(user_history) >= self.max_requests:
                wait_time = int(user_history[0] + self.window_seconds - now)
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Please try again in {wait_time} seconds."
                )
            
            # Add new request
            user_history.append(now)
            
            # Optional: Periodic cleanup could be added, but for now defaultdict handles dynamic users
            # and old timestamps are cleaned on access.
