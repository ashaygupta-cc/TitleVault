# agreements/canonicalize.py

import json
import unicodedata
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from enum import Enum
from web3 import Web3


def _normalize(obj):
    if isinstance(obj, str):
        return unicodedata.normalize("NFC", obj)

    if isinstance(obj, Decimal):
        # Deterministic numeric preservation
        return int(obj) if obj == obj.to_integral() else float(obj)

    if isinstance(obj, datetime):
        return obj.isoformat()

    if isinstance(obj, UUID):
        return str(obj)

    if isinstance(obj, Enum):
        return obj.name

    if isinstance(obj, dict):
        return {k: _normalize(v) for k, v in sorted(obj.items())}

    if isinstance(obj, list):
        return [_normalize(x) for x in obj]

    return obj


def build_canonical_agreement_json(agreement, installments):
    """
    Returns (canonical_json_str, canonical_hash_bytes)
    """

    data = {
        "agreement_id": str(agreement.id),

        # subject linkage
        "subject_type": agreement.subject_type,
        "subject_id": agreement.subject_id,

        # parties
        "buyer": agreement.buyer_address.lower(),
        "seller": agreement.seller_address.lower(),

        # financials
        "total_amount": agreement.total_amount,
        "advance_amount": agreement.advance_amount,

        # schedule
        "installments": [
            {
                "amount": i.amount,
                "due_date": i.due_date,
            }
            for i in sorted(installments, key=lambda x: x.due_date)
        ],

        # lifecycle
        "start_date": agreement.start_date,
        "completion_deadline": agreement.completion_deadline,
    }

    normalized = _normalize(data)

    canonical_json = json.dumps(
        normalized,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )

    canonical_hash = Web3.keccak(text=canonical_json)

    return canonical_json, canonical_hash
