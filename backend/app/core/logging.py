import logging
import json
import re
from typing import Any, Dict


REDACTED_KEYS = {
    "password", "secret", "token", "authorization", "access_token",
    "refresh_token", "jwt", "cvv", "credit_card", "card_number",
    "reserve_price", "min_acceptable_price", "api_key", "key_secret"
}


def redact_sensitive_data(data: Any) -> Any:
    """Recursively redacts sensitive keys and values from dicts/lists for logging."""
    if isinstance(data, dict):
        redacted = {}
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in REDACTED_KEYS):
                redacted[key] = "[REDACTED]"
            elif isinstance(value, (dict, list)):
                redacted[key] = redact_sensitive_data(value)
            else:
                redacted[key] = value
        return redacted
    elif isinstance(data, list):
        return [redact_sensitive_data(item) for item in data]
    elif isinstance(data, str):
        # Redact Bearer tokens if logged as strings
        if re.search(r'bearer\s+[A-Za-z0-9\-._~+/]+=*', data, re.IGNORECASE):
            return re.sub(r'(bearer\s+)[A-Za-z0-9\-._~+/]+=*', r'\1[REDACTED]', data, flags=re.IGNORECASE)
        return data
    return data


class SafeFormatter(logging.Formatter):
    """Custom formatter that automatically redacts sensitive data from log records."""

    def format(self, record: logging.LogRecord) -> str:
        orig_msg = record.getMessage()
        record.msg = redact_sensitive_data(orig_msg)
        return super().format(record)


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger("revalue")
    level = getattr(logging, log_level.upper(), logging.INFO)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setLevel(level)
        formatter = SafeFormatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d): %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logging()
