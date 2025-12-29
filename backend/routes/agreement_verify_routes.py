from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from web3 import Web3

from models import Agreement, get_db
from web3_client import (
    get_agreement_ledger_contract,
    is_subject_locked_on_chain,
)

router = APIRouter(tags=["Agreement Verification"])


# ------------------------------------------------------
# Helpers
# ------------------------------------------------------

def _is_land_hash(subject_id: str) -> bool:
    return subject_id.startswith("0x") and len(subject_id) == 66


def _canonical_flat_subject(subject_id: str) -> bytes:
    return Web3.keccak(text=str(subject_id).strip())


# ======================================================
# GET /agreement/verify/{agreement_id}
# ======================================================
@router.get("/verify/{agreement_id}")
def verify_agreement(
    agreement_id: str,
    db: Session = Depends(get_db),
):
    agreement = db.query(Agreement).get(agreement_id)
    if not agreement:
        raise HTTPException(404, "Agreement not found")

    is_flat = agreement.subject_type == "FLAT"

    ledger = get_agreement_ledger_contract()

    # 🔑 Canonical subject bytes
    if is_flat:
        subject_bytes = _canonical_flat_subject(agreement.subject_id)
    else:
        if not _is_land_hash(agreement.subject_id):
            raise HTTPException(400, "Invalid land record hash")
        subject_bytes = bytes.fromhex(agreement.subject_id[2:])

    try:
        anchor = ledger.functions.getAgreement(
            subject_bytes,
            is_flat,
        ).call()

        agreement_hash_on_chain = Web3.to_hex(anchor[0])
        status = anchor[1]
        activated_at = anchor[2]
        closed_at = anchor[3]
        on_chain = activated_at != 0

    except Exception:
        agreement_hash_on_chain = None
        status = None
        activated_at = 0
        closed_at = 0
        on_chain = False

    locked = status == 1 if status is not None else False

    return {
        "agreement_id": agreement_id,
        "subject_id": agreement.subject_id,
        "subject_type": agreement.subject_type,
        "db_status": agreement.status.value,
        "subject_locked": locked,
        "on_chain": on_chain,
        "agreement_hash": "0x" + agreement.agreement_hash.hex(),
        "on_chain_hash": agreement_hash_on_chain,
        "tx_hash": agreement.tx_hash,
        "activated_at": activated_at,
        "closed_at": closed_at,
    }


# ======================================================
# GET /agreement/subject-lock/{subject_id}
# ======================================================
@router.get("/subject-lock/{subject_id}")
def subject_lock_status(subject_id: str):
    is_land = _is_land_hash(subject_id)
    is_flat = not is_land

    return {
        "subject_id": subject_id,
        "subject_type": "LAND" if is_land else "FLAT",
        "locked": is_subject_locked_on_chain(subject_id, is_flat),
    }


# ======================================================
# GET /agreement/history/{subject_id}
# ======================================================
@router.get("/history/{subject_id}")
def agreement_history(
    subject_id: str,
    db: Session = Depends(get_db),
):
    agreements = (
        db.query(Agreement)
        .filter(Agreement.subject_id == subject_id)
        .order_by(Agreement.created_at.asc())
        .all()
    )

    return {
        "subject_id": subject_id,
        "count": len(agreements),
        "history": [
            {
                "agreement_id": str(a.id),
                "status": a.status.value,
                "agreement_hash": "0x" + a.agreement_hash.hex(),
                "tx_hash": a.tx_hash,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in agreements
        ],
    }
