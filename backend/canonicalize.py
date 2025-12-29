# backend/canonicalize.py

import json
import unicodedata
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from enum import Enum
from web3 import Web3


def canonicalize_to_bytes(data: dict) -> bytes:
    """
    Deterministic canonical JSON → UTF-8 bytes
    - Unicode NFC normalization
    - Sorted keys
    - No whitespace
    - Stable byte output
    - Decimal, datetime, UUID, Enum safe
    """

    def normalize(obj):
        if isinstance(obj, str):
            return unicodedata.normalize("NFC", obj)

        if isinstance(obj, Decimal):
            return int(obj) if obj == obj.to_integral() else float(obj)

        if isinstance(obj, datetime):
            return obj.isoformat()

        if isinstance(obj, UUID):
            return str(obj)

        if isinstance(obj, Enum):
            return obj.name

        if isinstance(obj, dict):
            return {k: normalize(v) for k, v in sorted(obj.items())}

        if isinstance(obj, list):
            return [normalize(x) for x in obj]

        return obj

    normalized = normalize(data)

    return json.dumps(
        normalized,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def compute_keccak256_from_bytes(data: bytes) -> str:
    return "0x" + Web3.keccak(data).hex()
