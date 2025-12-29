from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from web3 import Web3

from models import Agreement, PropertyRecord, FlatUnit, get_db
from routes.agreement_enforcement_routes import enforce_agreement
from web3_client import is_subject_locked_on_chain

router = APIRouter(tags=["Public Explorer"])


def _clean_hex(v: str) -> str:
    return v[2:] if v.startswith("0x") else v


def _safe_hex(value):
    if value is None:
        return None
    if isinstance(value, (bytes, bytearray)):
        return "0x" + value.hex()
    if isinstance(value, str):
        return value if value.startswith("0x") else "0x" + value
    return None


def _mask_address(addr: str | None):
    if not addr:
        return None
    return addr[:6] + "…" + addr[-4:]


# ======================================================
# LAND / PARCEL EXPLORER
# ======================================================
@router.get("/parcel/{record_hash}")
def explore_parcel(record_hash: str, db: Session = Depends(get_db)):

    clean = _clean_hex(record_hash)

    record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == bytes.fromhex(clean)
    ).first()

    if not record:
        raise HTTPException(404, "Parcel not found")

    locked = is_subject_locked_on_chain("0x" + clean, False)

    return {
        "record_hash": "0x" + clean,
        "owner": _mask_address(record.owner_address),
        "area_m2": float(record.area_m2) if record.area_m2 else None,
        "is_subdivided": record.subdivision_locked,
        "is_transferable": record.is_transferable,
        "parent_record": _safe_hex(record.parent_record),
        "locked_under_agreement": locked,
        "merkle_root": None,
        "created_at": record.created_at,
    }


# ======================================================
# FLAT EXPLORER
# ======================================================
@router.get("/flat/{flat_id}")
def explore_flat(flat_id: str, db: Session = Depends(get_db)):

    flat = db.query(FlatUnit).get(flat_id)
    if not flat:
        raise HTTPException(404, "Flat not found")

    # 🔑 FLAT SUBJECT = keccak(flat_id)
    locked = is_subject_locked_on_chain(flat_id, True)

    return {
        "flat_id": str(flat.id),
        "flat_number": flat.flat_number,
        "building_id": str(flat.building_id),
        "land_record_hash": _safe_hex(flat.land_record_hash),
        "owner": _mask_address(flat.owner_address),
        "area_m2": float(flat.area_m2),
        "is_transferable": flat.is_transferable,
        "locked_under_agreement": locked,
        "merkle_root": None,
    }


# ======================================================
# AGREEMENT EXPLORER
# ======================================================
@router.get("/agreement/{agreement_id}")
def explore_agreement(agreement_id: str, db: Session = Depends(get_db)):

    agreement = db.query(Agreement).get(agreement_id)
    if not agreement:
        raise HTTPException(404, "Agreement not found")

    enforcement = enforce_agreement(agreement_id, db)

    status = (
        agreement.status.value
        if hasattr(agreement.status, "value")
        else agreement.status
    )

    return {
        "agreement_id": agreement_id,
        "subject_type": agreement.subject_type,
        "subject_id": (
            agreement.subject_id.hex()
            if isinstance(agreement.subject_id, (bytes, bytearray))
            else str(agreement.subject_id)
        ),
        "status": status,
        "agreement_hash": "0x" + agreement.agreement_hash.hex(),
        "activation_tx": agreement.tx_hash,
        "closed_tx": agreement.closed_tx,
        "enforcement_snapshot": enforcement,
        "merkle_root": None,
        "created_at": agreement.created_at,
    }
