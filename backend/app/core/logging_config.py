"""
logging_config.py
-----------------
Configures structured logging for the AssistFlow backend.

Call setup_logging() once at startup (in main.py lifespan).
All loggers under the 'assistflow' namespace inherit this config.
"""

import logging
import sys


def setup_logging(level: str = "INFO") -> None:
    """
    Sets up a clean, structured log format across the entire application.

    Format:
        2026-09-27 12:00:00,000 | INFO     | assistflow.chat_service | message
    """
    log_level = getattr(logging, level.upper(), logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Root logger — catches everything including uvicorn and fastapi
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Avoid duplicate handlers if called more than once
    if not root_logger.handlers:
        root_logger.addHandler(handler)
    else:
        root_logger.handlers = [handler]

    # Quiet down noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("chromadb").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
