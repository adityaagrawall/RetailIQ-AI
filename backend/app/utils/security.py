import os
import re
import hashlib
from pathlib import Path
from typing import Optional
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Characters that indicate CSV formula injection
FORMULA_INJECTION_CHARS = frozenset(["=", "+", "-", "@", "\t", "\r"])

# Allowed MIME types for uploads
ALLOWED_MIME_TYPES = {
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/csv",
    "text/plain",
}

# Magic bytes for file type detection
CSV_MAGIC = None  # CSV has no magic bytes — use extension + MIME
XLSX_MAGIC = b"PK\x03\x04"  # ZIP-based format


def sanitize_filename(filename: str) -> str:
    """
    Remove path traversal characters and limit filename length.
    Replaces unsafe characters with underscores.
    """
    # Strip directory components
    filename = Path(filename).name
    # Replace non-alphanumeric (except dot, dash, underscore) with _
    filename = re.sub(r"[^\w\-.]", "_", filename)
    # Limit length
    if len(filename) > 255:
        stem = Path(filename).stem[:240]
        suffix = Path(filename).suffix
        filename = stem + suffix
    return filename


def validate_file_extension(filename: str, allowed: list[str]) -> bool:
    """Check that file has an allowed extension."""
    ext = Path(filename).suffix.lower()
    return ext in allowed


def check_file_magic_bytes(content: bytes, filename: str) -> bool:
    """
    Validate file type by checking magic bytes.
    For xlsx files, verify ZIP magic bytes. CSV has no magic bytes.
    """
    ext = Path(filename).suffix.lower()
    if ext == ".xlsx":
        return content[:4] == XLSX_MAGIC
    elif ext == ".csv":
        # CSV: just ensure it's text-decodable
        try:
            content[:1024].decode("utf-8", errors="strict")
            return True
        except UnicodeDecodeError:
            try:
                content[:1024].decode("latin-1", errors="strict")
                return True
            except Exception:
                return False
    return False


def sanitize_cell_value(value: str) -> str:
    """
    Prevent CSV injection by stripping leading formula characters.
    This is applied to all string columns during ingestion.
    """
    if not isinstance(value, str):
        return value
    value = value.strip()
    while value and value[0] in FORMULA_INJECTION_CHARS:
        value = value[1:].strip()
    return value


def compute_context_hash(context: dict) -> str:
    """SHA-256 hash of a dict — used for AI insight caching."""
    import json
    content = json.dumps(context, sort_keys=True, default=str)
    return hashlib.sha256(content.encode()).hexdigest()
