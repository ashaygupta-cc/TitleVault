from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from shapely.geometry import Polygon as ShapelyPolygon
import json
from sqlalchemy import text
from deps.auth import require_admin

from models import PropertyRecord, get_db
from schemas.registry_schema import (
    CreateRecordRequest,
    CreateRecordResponse,
    TransferRecordRequest,
)

from canonicalize import (
    canonicalize_to_bytes,
    compute_keccak256_from_bytes,
)
from ipfs_client import upload_bytes_to_ipfs, fetch_raw_from_ipfs
from web3_client import (
    send_create_record_tx,
    send_transfer_record_tx,
    get_record_from_chain,
)
from utils.bytes32 import to_bytes32


router = APIRouter(tags=["registry"])

# ======================================================
# POST /registry/create
# ======================================================
@router.post("/create", response_model=CreateRecordResponse)
def create_record(req: CreateRecordRequest, db: Session = Depends(get_db)):

    print("\n================ CREATE RECORD =================")

    coords = req.polygon.coordinates
    if coords[0] != coords[-1]:
        raise HTTPException(status_code=400, detail="Polygon must be closed")

    shapely_poly = ShapelyPolygon(coords)
    geom_wkt = shapely_poly.wkt

    record_json = {
        "owner": req.owner_address,
        "metadata": req.metadata,
        "polygon": coords,
    }

    # 🔑 SINGLE SOURCE OF TRUTH
    canonical_bytes = canonicalize_to_bytes(record_json)

    record_hash_hex = compute_keccak256_from_bytes(canonical_bytes)
    record_hash_bytes = to_bytes32(record_hash_hex)

    cid = upload_bytes_to_ipfs(canonical_bytes)

    tx_hash = send_create_record_tx(
        record_hash_hex=record_hash_hex,
        cid=cid,
        owner_addr=req.owner_address,
        registrar_sig=b"",
    )

    new_record = PropertyRecord(
    cid=cid,
    record_hash=record_hash_bytes,
    canonical_hash=record_hash_bytes,
    format="CANONICAL",
    owner_address=req.owner_address,
    canonical_json=canonical_bytes.decode("utf-8"),
    geom=f"SRID=4326;{geom_wkt}",
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    area_m2 = db.execute(
        text("SELECT ST_Area(geom::geography) FROM property_records WHERE id = :id"),
        {"id": str(new_record.id)},
    ).scalar()

    new_record.area_m2 = area_m2
    db.commit()

    return {
        "id": str(new_record.id),
        "cid": cid,
        "record_hash": record_hash_hex,
        "area_m2": area_m2,
        "tx_hash": tx_hash,
    }

# ======================================================
# POST /registry/transfer
# ======================================================
@router.post("/transfer")
def transfer_record(req: TransferRecordRequest, db: Session = Depends(get_db)):

    old_record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == to_bytes32(req.old_record_hash)
    ).first()

    if not old_record:
        raise HTTPException(status_code=404, detail="Original record not found")

    old_data = json.loads(old_record.canonical_json)

    record_json = {
        "owner": req.new_owner_address,
        "metadata": req.metadata,
        "polygon": old_data["polygon"],
    }

    canonical_bytes = canonicalize_to_bytes(record_json)

    new_hash_hex = compute_keccak256_from_bytes(canonical_bytes)
    new_hash_bytes = to_bytes32(new_hash_hex)

    cid = upload_bytes_to_ipfs(canonical_bytes)

    tx_hash = send_transfer_record_tx(
        old_record_hash_hex="0x" + old_record.record_hash.hex(),
        new_record_hash_hex=new_hash_hex,
        cid=cid,
        new_owner=req.new_owner_address,
        registrar_sig=b"",
    )

    new_record = PropertyRecord(
    cid=cid,
    record_hash=new_hash_bytes,
    canonical_hash=new_hash_bytes,    
    format="CANONICAL",               
    owner_address=req.new_owner_address,
    canonical_json=canonical_bytes.decode("utf-8"),
    geom=old_record.geom,
    area_m2=old_record.area_m2,
    parent_record=old_record.record_hash,
    )


    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {
        "old_record_hash": "0x" + old_record.record_hash.hex(),
        "new_record_hash": new_hash_hex,
        "cid": cid,
        "tx_hash": tx_hash,
    }

# ======================================================
# GET /registry/list
# ======================================================
@router.get("/list")
def list_records(db: Session = Depends(get_db)):
    return [
        {
            "id": str(r.id),
            "cid": r.cid,
            "record_hash": "0x" + r.record_hash.hex(),
            "owner_address": r.owner_address,
            "area_m2": r.area_m2,
            "parent_record": "0x" + r.parent_record.hex() if r.parent_record else None,
        }
        for r in db.query(PropertyRecord).all()
    ]

# ======================================================
# GET /registry/verify/{record_hash}
# ======================================================
@router.get("/verify/{record_hash}")
def verify_record(record_hash: str, db: Session = Depends(get_db)):

    print("\n================ VERIFY RECORD =================")

    clean = record_hash[2:] if record_hash.startswith("0x") else record_hash
    record_hash_bytes = to_bytes32(record_hash)

    # 1️⃣ DB LOOKUP
    db_record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == record_hash_bytes
    ).first()

    if not db_record:
        return {
            "record_hash": "0x" + clean,
            "status": "NOT_FOUND",
            "db_exists": False,
            "ipfs_exists": False,
            "blockchain_exists": False,
        }
    
    print("🔎 canonical_hash:", db_record.canonical_hash.hex())
    print("🔎 record_hash   :", db_record.record_hash.hex())
    print("🔎 format        :", db_record.format)
    # 2️⃣ IPFS FETCH (existence proof)
    try:
        raw_ipfs = fetch_raw_from_ipfs(db_record.cid)
        ipfs_exists = True
    except Exception:
        raw_ipfs = None
        ipfs_exists = False

    # 3️⃣ READ FROM BLOCKCHAIN
    owner, cid, timestamp, registrar, registrar_sig, parent_hash = \
        get_record_from_chain(record_hash)

    blockchain_exists = timestamp != 0
    owner_match = owner.lower() == db_record.owner_address.lower()
    cid_match = cid == db_record.cid
    
    parent_match = (
    (db_record.parent_record is None and parent_hash == b"\x00" * 32)
    or (
        db_record.parent_record is not None
        and parent_hash == db_record.parent_record
       )
    )

    # 4️⃣ LEGACY DETECTION (UNCHANGED)
    is_legacy = db_record.format != "CANONICAL"

    # 5️⃣ HASH VERIFICATION (FIXED SOURCE)
    if is_legacy:
        hash_match = None
    else:
        canonical_bytes = db_record.canonical_json.encode("utf-8")
        computed_hash = compute_keccak256_from_bytes(canonical_bytes)
        db_hash_hex = "0x" + db_record.canonical_hash.hex()
        hash_match = (computed_hash == db_hash_hex)

    # 6️⃣ FINAL STATUS (UNCHANGED SEMANTICS)
    if not blockchain_exists:
        status = "NOT_ON_CHAIN"

    elif not ipfs_exists:
        status = "INVALID_IPFS"

    elif not owner_match:
        status = "TAMPERED"

    elif not cid_match:
        status = "TAMPERED"

    elif not parent_match:
        status = "TAMPERED"

    elif is_legacy:
        status = "LEGACY"

    elif hash_match:
        status = "VERIFIED"

    else:
        status = "TAMPERED"

    print("🏁 FINAL STATUS:", status)

    return {
        "record_hash": "0x" + clean,
        "status": status,
        "db_exists": True,
        "ipfs_exists": ipfs_exists,
        "blockchain_exists": blockchain_exists,
        "parent_match": parent_match,
        "hash_match": hash_match,
        "cid_match": cid_match,
        "owner_match": owner_match,
        "is_legacy": is_legacy,
    }


# ======================================================
# GET /registry/history/{record_hash}
# ======================================================
@router.get("/history/{record_hash}")
def record_history(record_hash: str, db: Session = Depends(get_db)):

    clean = record_hash[2:] if record_hash.startswith("0x") else record_hash
    current = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == bytes.fromhex(clean)
    ).first()

    if not current:
        raise HTTPException(status_code=404, detail="Record not found")

    history = []
    while current:
        history.append({
            "record_hash": "0x" + current.record_hash.hex(),
            "owner_address": current.owner_address,
            "cid": current.cid,
            "area_m2": current.area_m2,
            "created_at": current.created_at,
            "parent_record": (
                "0x" + current.parent_record.hex()
                if current.parent_record else None
            )
        })
        current = (
            db.query(PropertyRecord)
            .filter(PropertyRecord.record_hash == current.parent_record)
            .first()
            if current.parent_record else None
        )

    return {
        "root_record": history[-1]["record_hash"],
        "current_record": history[0]["record_hash"],
        "length": len(history),
        "history": history
    }
