from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Literal
from web3 import Web3
from uuid import UUID
from datetime import datetime
import json
from slowapi import Limiter
from slowapi.util import get_remote_address

from models import (
    Agreement,
    PropertyRecord,
    FlatUnit,
    get_db,
    AgreementStatus,
    AuditLog,
)
from schemas.agreement_schema import AgreementListResponse, AgreementListItem
from utils.activity_logger import log_user_activity
from schemas.agreement_schema import (
    CreateAgreementRequest,
    AgreementResponse,
    AgreementActionResponse,
)
from web3_client import (
    send_activate_land_agreement_tx,
    send_activate_flat_agreement_tx,
    send_close_agreement_tx,
    is_subject_locked_on_chain,
)
from canonicalize import canonicalize_to_bytes, compute_keccak256_from_bytes
from deps.auth import require_admin, get_current_user

router = APIRouter(tags=["Agreement"])
limiter = Limiter(key_func=get_remote_address)


# ------------------------------------------------------
# Helpers
# ------------------------------------------------------
def validate_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError:
        raise HTTPException(400, "agreement_id must be a valid UUID")





router = APIRouter(tags=["Agreement"])


# ======================================================
# GET /agreement/list
# ======================================================
@router.get("/list", response_model=AgreementListResponse)
def list_agreements(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    
    agreements = db.query(Agreement).order_by(Agreement.created_at.desc()).all()
    items = []
    for a in agreements:
        # Try to extract division from canonical_json if present
        division = None
        try:
            canonical = a.canonical_json
            if isinstance(canonical, str):
                import json
                canonical = json.loads(canonical)
            division = canonical.get("division")
        except Exception:
            division = None
        items.append(AgreementListItem(
            agreement_id=str(a.id),
            status=a.status.name if hasattr(a.status, 'name') else str(a.status),
            subject_id=a.subject_id,
            subject_type=a.subject_type,
            agreement_hash=a.agreement_hash.hex() if hasattr(a.agreement_hash, 'hex') else str(a.agreement_hash),
            created_at=a.created_at,
            division=division,
        ))
    return AgreementListResponse(items=items)
    PropertyRecord,
    FlatUnit,
    get_db,
    AgreementStatus,


# ======================================================
# POST /agreement/create
# ======================================================
@router.post("/create", response_model=AgreementResponse)
@limiter.limit("100/hour")
def create_agreement(
    request: Request,
    req: CreateAgreementRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin),
):

    # 🔒 HARD RULE: FLAT must use UUID, NOT hash
    if req.subject_type == "FLAT" and req.subject_id.startswith("0x"):
        raise HTTPException(
            400,
            "For FLAT agreements, subject_id must be flat UUID (not hash)"
        )

    # --------------------------------------------------
    # Resolve subject
    # --------------------------------------------------
    if req.subject_type == "LAND":
        subject = db.query(PropertyRecord).filter(
            PropertyRecord.record_hash == bytes.fromhex(req.subject_id[2:])
        ).first()
    else:
        subject = db.query(FlatUnit).get(req.subject_id)

    if not subject:
        raise HTTPException(404, "Subject not found")

    # --------------------------------------------------
    # Prevent duplicate active/draft agreements
    # --------------------------------------------------
    existing = db.query(Agreement).filter(
        Agreement.subject_id == req.subject_id,
        Agreement.status.in_([AgreementStatus.DRAFT, AgreementStatus.ACTIVE]),
    ).first()

    if existing:
        raise HTTPException(409, "Pending or active agreement already exists")

    # --------------------------------------------------
    # On-chain lock check (uses correct subject key internally)
    # --------------------------------------------------
    if is_subject_locked_on_chain(
        req.subject_id,
        req.subject_type == "FLAT",
    ):
        raise HTTPException(409, "Subject already locked on-chain")

    # --------------------------------------------------
    # Canonical agreement body
    # --------------------------------------------------
    canonical = {
        "subject_type": req.subject_type,
        "subject_id": req.subject_id,
        "buyer": req.buyer_address.lower(),
        "seller": req.seller_address.lower(),
        "total_price": int(req.total_price),
        "paid_upfront": int(req.paid_upfront),
        "schedule": [
            {
                "amount": int(s.amount),
                "due_in_days": int(s.due_in_days),
            }
            for s in req.schedule
        ],
        "agreement_type": req.agreement_type,
        "lease_end": (
            req.lease_end_date.isoformat()
            if req.lease_end_date
            else None
        ),
    }

    canonical_bytes = canonicalize_to_bytes(canonical)
    agreement_hash = compute_keccak256_from_bytes(canonical_bytes)

    # --------------------------------------------------
    # Persist agreement
    # --------------------------------------------------
    agreement = Agreement(
        subject_type=req.subject_type,
        subject_id=req.subject_id,
        canonical_json=canonical_bytes.decode("utf-8"),
        agreement_hash=bytes.fromhex(agreement_hash[2:]),
        status=AgreementStatus.DRAFT,
    )

    db.add(agreement)
    db.commit()
    db.refresh(agreement)

    return AgreementResponse(
        agreement_id=str(agreement.id),
        agreement_hash=agreement_hash,
        status=agreement.status.name,
        subject_id=req.subject_id,
        subject_type=req.subject_type,
    )


# ======================================================
# GET /agreement/{agreement_id}
# ======================================================
@router.get("/{agreement_id}")
def get_agreement(agreement_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    agreement_id = validate_uuid(agreement_id)

    agreement = db.query(Agreement).get(agreement_id)
    if not agreement:
        raise HTTPException(404, "Agreement not found")

    return {
        "agreement_id": str(agreement.id),
        "subject_type": agreement.subject_type,
        "subject_id": agreement.subject_id,
        "agreement_hash": Web3.to_hex(agreement.agreement_hash),
        "status": agreement.status.name,
        "tx_hash": agreement.tx_hash,
        "created_at": agreement.created_at,
    }


# ======================================================
# POST /agreement/activate/{agreement_id}
# ======================================================
@router.post("/activate/{agreement_id}", response_model=AgreementActionResponse)
@limiter.limit("100/hour")
def activate_agreement(
    request: Request,
    agreement_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin),
):
    agreement_id = validate_uuid(agreement_id)

    agreement = db.query(Agreement).get(agreement_id)
    if not agreement or agreement.status != AgreementStatus.DRAFT:
        raise HTTPException(400, "Agreement not activatable")

    if is_subject_locked_on_chain(
        agreement.subject_id,
        agreement.subject_type == "FLAT",
    ):
        raise HTTPException(409, "Subject already locked")

    # --------------------------------------------------
    # On-chain activation
    # --------------------------------------------------
    if agreement.subject_type == "LAND":
        tx = send_activate_land_agreement_tx(
            agreement.subject_id,
            Web3.to_hex(agreement.agreement_hash),
        )

        land = db.query(PropertyRecord).filter(
            PropertyRecord.record_hash ==
            bytes.fromhex(agreement.subject_id[2:])
        ).first()

        land.is_transferable = False

    else:
        tx = send_activate_flat_agreement_tx(
            agreement.subject_id,  # ✅ flat UUID
            Web3.to_hex(agreement.agreement_hash),
        )

        flat = db.query(FlatUnit).get(agreement.subject_id)
        if not flat:
            raise HTTPException(404, "Flat not found")

        flat.is_locked = True
        flat.is_transferable = False

    agreement.status = AgreementStatus.ACTIVE
    agreement.tx_hash = tx
    agreement.created_at = datetime.utcnow()

    db.commit()

    return AgreementActionResponse(
        agreement_id=str(agreement.id),
        status="ACTIVE",
        tx_hash=tx,
    )


# ======================================================
# POST /agreement/action/{action}/{agreement_id}
# ======================================================
@router.post("/action/{action}/{agreement_id}", response_model=AgreementActionResponse)
@limiter.limit("100/hour")
def close_agreement(
    request: Request,
    action: Literal["complete", "cancel", "default"],
    agreement_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin),
):
    agreement_id = validate_uuid(agreement_id)
    agreement = db.query(Agreement).get(agreement_id)

    if not agreement or agreement.status != AgreementStatus.ACTIVE:
        raise HTTPException(400, "Agreement not active")

    tx = send_close_agreement_tx(
        agreement.subject_id,
        agreement.subject_type == "FLAT",
        action,
    )

    canonical = json.loads(agreement.canonical_json)

    if agreement.subject_type == "FLAT":
        flat = db.query(FlatUnit).get(agreement.subject_id)
        if not flat:
            raise HTTPException(404, "Flat not found")

        if action == "complete":
            flat.owner_address = canonical["buyer"]

        flat.is_locked = False
        flat.is_transferable = True

    STATUS_MAP = {
        "complete": AgreementStatus.COMPLETED,
        "cancel": AgreementStatus.CANCELLED,
        "default": AgreementStatus.DEFAULTED,
    }

    agreement.status = STATUS_MAP[action]
    agreement.closed_tx = tx

    db.commit()

    return AgreementActionResponse(
        agreement_id=str(agreement.id),
        status=agreement.status.name,
        tx_hash=tx,
    )
