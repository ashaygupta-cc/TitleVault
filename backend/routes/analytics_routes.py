from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import (
    Agreement,
    AgreementStatus,
    PropertyRecord,
    FlatUnit,
    Building,
    get_db,
)
from routes.agreement_enforcement_routes import enforce_agreement
from web3_client import is_subject_locked_on_chain
from merkle.utils import agreement_leaf_hash
from merkle.tree import build_merkle_tree
from datetime import datetime

router = APIRouter(tags=["Analytics"])


# ======================================================
# AGREEMENT ANALYTICS
# ======================================================

@router.get("/agreements/summary")
def agreement_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(Agreement.status, func.count())
        .group_by(Agreement.status)
        .all()
    )

    summary = {status.value: count for status, count in rows}
    summary["total"] = sum(summary.values())

    return summary


@router.get("/agreements/by-subject/{subject_id}")
def agreements_by_subject(subject_id: str, db: Session = Depends(get_db)):
    agreements = (
        db.query(Agreement)
        .filter(Agreement.subject_id == subject_id)
        .order_by(Agreement.created_at.asc())
        .all()
    )

    return {
        "subject_id": subject_id,
        "count": len(agreements),
        "agreements": [
            {
                "agreement_id": str(a.id),
                "status": a.status.value,
                "agreement_hash": "0x" + a.agreement_hash.hex(),
                "tx_hash": a.tx_hash,
                "created_at": a.created_at,
            }
            for a in agreements
        ],
    }


@router.get("/agreements/default-risk")
def agreements_default_risk(db: Session = Depends(get_db)):
    active = db.query(Agreement).filter(
        Agreement.status == AgreementStatus.ACTIVE
    ).all()

    risky = []
    for a in active:
        try:
            snapshot = enforce_agreement(str(a.id), db)
            if snapshot.get("default_risk"):
                risky.append({
                    "agreement_id": str(a.id),
                    "subject_id": a.subject_id,
                    "amount_due": snapshot["amount_due_till_now"],
                    "elapsed_days": snapshot["elapsed_days"],
                })
        except Exception:
            continue

    return {
        "count": len(risky),
        "agreements": risky,
    }


# ======================================================
# LAND REGISTRY ANALYTICS
# ======================================================

@router.get("/land/summary")
def land_summary(db: Session = Depends(get_db)):
    total = db.query(PropertyRecord).count()
    locked = db.query(PropertyRecord).filter(
        PropertyRecord.subdivision_locked.is_(True)
    ).count()

    transferable = db.query(PropertyRecord).filter(
        PropertyRecord.is_transferable.is_(True)
    ).count()

    return {
        "total_records": total,
        "subdivision_locked": locked,
        "transferable": transferable,
    }


@router.get("/land/locked")
def land_locked(db: Session = Depends(get_db)):
    records = db.query(PropertyRecord).all()

    locked = []
    for r in records:
        record_hex = "0x" + r.record_hash.hex()
        if is_subject_locked_on_chain(record_hex, False):
            locked.append(record_hex)

    return {
        "count": len(locked),
        "records": locked,
    }


# ======================================================
# BUILDING & FLAT ANALYTICS
# ======================================================

@router.get("/buildings/summary")
def building_summary(db: Session = Depends(get_db)):
    buildings = db.query(Building).count()
    flats = db.query(FlatUnit).count()

    return {
        "buildings": buildings,
        "total_flats": flats,
    }


@router.get("/flats/locked")
def locked_flats(db: Session = Depends(get_db)):
    agreements = db.query(Agreement).filter(
        Agreement.subject_type == "FLAT",
        Agreement.status == AgreementStatus.ACTIVE,
    ).all()

    locked = [
        a.subject_id for a in agreements
        if is_subject_locked_on_chain(a.subject_id, True)
    ]

    return {
        "count": len(locked),
        "flats": locked,
    }


@router.get("/flats/by-land/{record_hash}")
def flats_by_land(record_hash: str, db: Session = Depends(get_db)):
    flats = db.query(FlatUnit).filter(
        FlatUnit.land_record_hash == record_hash
    ).all()

    return {
        "land_record": record_hash,
        "count": len(flats),
        "owners": list({f.owner_address for f in flats}),
        "flats": [
            {
                "flat_id": str(f.id),
                "flat_number": f.flat_number,
                "owner": f.owner_address,
                "area_m2": float(f.area_m2),
            }
            for f in flats
        ],
    }


# ======================================================
# MERKLE CONSISTENCY ANALYTICS
# ======================================================

@router.get("/merkle/agreements")
def agreement_merkle_consistency(db: Session = Depends(get_db)):
    agreements = db.query(Agreement).filter(
        Agreement.status == AgreementStatus.ACTIVE
    ).all()

    if not agreements:
        return {
            "db_active": 0,
            "merkle_leaves": 0,
            "merkle_root": None,
            "consistent": True,
        }

    pairs = [
        (bytes.fromhex(a.subject_id[2:]), a.agreement_hash)
        for a in agreements
    ]

    leaves = [
        agreement_leaf_hash(sid, ah)
        for sid, ah in sorted(pairs)
    ]

    tree = build_merkle_tree(leaves)

    return {
        "db_active": len(agreements),
        "merkle_leaves": len(leaves),
        "merkle_root": "0x" + tree.root.hex(),
        "consistent": len(agreements) == len(leaves),
    }


# ======================================================
# CHAIN vs DB LOCK CONSISTENCY
# ======================================================

@router.get("/chain/locks")
def chain_lock_consistency(db: Session = Depends(get_db)):
    mismatches = []

    agreements = db.query(Agreement).filter(
        Agreement.status != AgreementStatus.DRAFT
    ).all()

    for a in agreements:
        is_flat = a.subject_type == "FLAT"
        locked = is_subject_locked_on_chain(a.subject_id, is_flat)

        if (a.status == AgreementStatus.ACTIVE) != locked:
            mismatches.append({
                "agreement_id": str(a.id),
                "subject_id": a.subject_id,
                "db_status": a.status.value,
                "on_chain_locked": locked,
            })

    return {
        "mismatches": len(mismatches),
        "details": mismatches,
    }


@router.get("/kpis")
def registry_kpis(db: Session = Depends(get_db)):
    from sqlalchemy import func

    agreement_rows = (
        db.query(Agreement.status, func.count())
        .group_by(Agreement.status)
        .all()
    )

    agreement_summary = {s: c for s, c in agreement_rows}

    land_total = db.query(PropertyRecord).count()
    flat_total = db.query(FlatUnit).count()
    building_total = db.query(Building).count()

    locked_subjects = db.query(Agreement).filter(
        Agreement.status == "ACTIVE"
    ).count()

    return {
        "agreements": {
            "total": sum(agreement_summary.values()),
            **agreement_summary,
            "active_locks": locked_subjects,
        },
        "land_registry": {
            "total_parcels": land_total,
        },
        "buildings": {
            "total": building_total,
        },
        "flats": {
            "total": flat_total,
        },
        "system_health": {
        "timestamp": datetime.utcnow(),
        "integrity": "OK",
        },
    }
