"""
middleware.py
-------------
Request/response logging middleware for the AssistFlow backend.

Logs every inbound request and its outcome:
  → method, path, status code, and wall-clock latency in ms.

This feeds Module 6 (Evaluation & Metrics) by providing latency data
for every query without needing to instrument each route individually.

Example log line:
  POST /api/chat | 200 | 1342.5ms
  GET  /api/health | 200 | 1.2ms
"""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("assistflow.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs method, path, status code, and latency for every request."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as exc:
            elapsed = round((time.perf_counter() - start) * 1000, 1)
            logger.error(
                "%s %s | ERROR | %.1fms | %s",
                request.method,
                request.url.path,
                elapsed,
                exc,
            )
            raise

        elapsed = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "%s %s | %s | %.1fms",
            request.method,
            request.url.path,
            status_code,
            elapsed,
        )

        return response
