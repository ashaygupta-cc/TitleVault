# backend/canonicalize.py

import json
import unicodedata
from web3 import Web3


def canonicalize_to_bytes(data: dict) -> bytes:
    """
    Deterministic canonical JSON → UTF-8 bytes
    - Unicode NFC normalization
    - Sorted keys
    - No whitespace
    - Stable byte output
    """

    def normalize(obj):
        if isinstance(obj, str):
            return unicodedata.normalize("NFC", obj)
        elif isinstance(obj, dict):
            return {k: normalize(v) for k, v in sorted(obj.items())}
        elif isinstance(obj, list):
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
