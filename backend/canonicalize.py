# backend/canonicalize.py

import json
import unicodedata
from web3 import Web3


def canonicalize_json(data: dict) -> str:
    """
    Deterministic canonical JSON:
    - Unicode NFC normalization
    - Sorted keys
    - No whitespace
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
    )


def compute_keccak256(canonical_json: str) -> str:
    """
    Ethereum-compatible keccak256 hash
    """
    return Web3.keccak(text=canonical_json).hex()
