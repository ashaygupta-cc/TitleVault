import json
from decimal import Decimal
from datetime import datetime
from web3 import Web3


def _normalize(obj):
    """
    Recursively normalize objects so they are JSON-serializable
    and deterministic for hashing.
    """
    if isinstance(obj, Decimal):
        # block_number, numeric fields
        return int(obj)

    if isinstance(obj, datetime):
        return obj.isoformat()

    if isinstance(obj, dict):
        return {k: _normalize(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [_normalize(v) for v in obj]

    return obj


def compute_affidavit_hash(affidavit: dict) -> str:
    """
    Compute keccak256 hash of canonicalized affidavit JSON.
    """
    canonical_affidavit = _normalize(affidavit)

    canonical_json = json.dumps(
        canonical_affidavit,
        sort_keys=True,
        separators=(",", ":"),
    )

    digest = Web3.keccak(text=canonical_json)
    return Web3.to_hex(digest)
