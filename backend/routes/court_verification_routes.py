# backend/routes/court_verification_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import PropertyRecord, Agreement, get_db
from web3_client import is_subject_locked_on_chain

router = APIRouter(tags=["Court Verification"])


@router.get("/parcel/{record_hash}")
def court_verify_parcel(record_hash: str, db: Session = Depends(get_db)):
    record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == bytes.fromhex(record_hash[2:])
    ).first()

    if not record:
        raise HTTPException(404, "Parcel not found")

    locked = is_subject_locked_on_chain(record_hash, False)

    return {
        "verification_version": "1.0",
        "record_hash": record_hash,
        "owner": record.owner_address,
        "area_m2": record.area_m2,
        "is_subdivided": record.subdivision_locked,
        "locked_under_agreement": locked,
        "created_at": record.created_at,
        "legal_note": "Verified against canonical registry and blockchain anchor",
    }


@router.get("/agreement/{agreement_id}")
def court_verify_agreement(agreement_id: str, db: Session = Depends(get_db)):
    agreement = db.query(Agreement).get(agreement_id)
    if not agreement:
        raise HTTPException(404, "Agreement not found")

    locked = is_subject_locked_on_chain(
        agreement.subject_id,
        agreement.subject_type == "FLAT",
    )

    return {
        "verification_version": "1.0",
        "agreement_id": agreement_id,
        "subject_id": agreement.subject_id,
        "subject_type": agreement.subject_type,
        "status": agreement.status,
        "agreement_hash": "0x" + agreement.agreement_hash.hex(),
        "locked_on_chain": locked,
        "activation_tx": agreement.tx_hash,
        "closed_tx": agreement.closed_tx,
        "created_at": agreement.created_at,
        "note": "Court verification snapshot (read-only)",
    }
