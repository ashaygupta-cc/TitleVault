from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from shapely.geometry import Polygon as ShapelyPolygon
from datetime import datetime
import json
from sqlalchemy import text

from deps.auth import require_admin  

from models import PropertyRecord, get_db
from schemas.registry_schema import (
    CreateRecordRequest,
    CreateRecordResponse,
    TransferRecordRequest,
)
from canonicalize import canonicalize_to_bytes, compute_keccak256_from_bytes
from ipfs_client import upload_bytes_to_ipfs, fetch_raw_from_ipfs
from web3_client import (
    send_create_record_tx,
    send_transfer_record_tx,
    get_record_from_chain,
    is_subject_locked_on_chain,
)
from utils.bytes32 import parse_bytes32
from utils.geometry import aggregate_child_polygons

router = APIRouter(tags=["registry"])


# ======================================================
# POST /registry/create
# ======================================================
@router.post("/create", response_model=CreateRecordResponse)
def create_record(req: CreateRecordRequest, db: Session = Depends(get_db)):

    coords = req.polygon.coordinates
    if coords[0] != coords[-1]:
        raise HTTPException(400, "Polygon must be closed")

    shapely_poly = ShapelyPolygon(coords)

    record_json = {
        "owner": req.owner_address,
        "metadata": req.metadata,
        "polygon": coords,
    }

    canonical_bytes = canonicalize_to_bytes(record_json)
    record_hash_hex = compute_keccak256_from_bytes(canonical_bytes)

    # ✅ STRICT – no padding
    record_hash_bytes = parse_bytes32(record_hash_hex)

    cid = upload_bytes_to_ipfs(canonical_bytes)

    tx_hash = send_create_record_tx(
        record_hash_hex=record_hash_hex,
        cid=cid,
        owner_addr=req.owner_address,
        registrar_sig=b"",
    )

    record = PropertyRecord(
        cid=cid,
        record_hash=record_hash_bytes,
        canonical_hash=record_hash_bytes,
        format="CANONICAL",
        owner_address=req.owner_address,
        canonical_json=canonical_bytes.decode("utf-8"),
        geom=f"SRID=4326;{shapely_poly.wkt}",
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    area_m2 = db.execute(
        text("SELECT ST_Area(geom::geography) FROM property_records WHERE id = :id"),
        {"id": str(record.id)},
    ).scalar()

    record.area_m2 = area_m2
    db.commit()

    return {
        "id": str(record.id),
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

    old_hash_bytes = parse_bytes32(req.old_record_hash)

    old = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == old_hash_bytes
    ).first()

    if not old:
        raise HTTPException(404, "Original record not found")

    if is_subject_locked_on_chain(req.old_record_hash, False):
        raise HTTPException(409, "Record locked under active agreement")

    if old.subdivision_locked:
        raise HTTPException(400, "Cannot transfer subdivided parent record")

    old_data = json.loads(old.canonical_json)

    record_json = {
        "owner": req.new_owner_address,
        "metadata": req.metadata,
        "polygon": old_data["polygon"],
    }

    canonical_bytes = canonicalize_to_bytes(record_json)
    new_hash_hex = compute_keccak256_from_bytes(canonical_bytes)
    new_hash_bytes = parse_bytes32(new_hash_hex)

    cid = upload_bytes_to_ipfs(canonical_bytes)

    tx_hash = send_transfer_record_tx(
        old_record_hash_hex=req.old_record_hash,
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
        geom=old.geom,
        area_m2=old.area_m2,
        parent_record=old.record_hash,
    )

    db.add(new_record)
    db.commit()

    return {
        "old_record_hash": req.old_record_hash,
        "new_record_hash": new_hash_hex,
        "cid": cid,
        "tx_hash": tx_hash,
    }


# ======================================================
# GET /registry/verify/{record_hash}
# ======================================================
@router.get("/verify/{record_hash}")
def verify_record(record_hash: str, db: Session = Depends(get_db)):

    record_hash_bytes = parse_bytes32(record_hash)
    clean = record_hash_bytes.hex()

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

    if db_record.subdivision_locked:
        return {
            "record_hash": "0x" + clean,
            "status": "SUBDIVIDED_PARENT",
            "db_exists": True,
            "ipfs_exists": True,
            "blockchain_exists": True,
        }

    try:
        fetch_raw_from_ipfs(db_record.cid)
        ipfs_exists = True
    except Exception:
        ipfs_exists = False

    owner, cid, timestamp, registrar, registrar_sig, parent_hash, _ = \
        get_record_from_chain("0x" + clean)

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

    canonical_bytes = db_record.canonical_json.encode("utf-8")
    hash_match = compute_keccak256_from_bytes(canonical_bytes) == "0x" + db_record.canonical_hash.hex()

    status = (
        "VERIFIED" if blockchain_exists and ipfs_exists and owner_match
        and cid_match and parent_match and hash_match
        else "TAMPERED"
    )

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
        "is_legacy": False,
    }


# ======================================================
# GET /registry/record/{record_hash}
# ======================================================
@router.get("/record/{record_hash}")
def get_record_details(record_hash: str, db: Session = Depends(get_db)):

    record_hash_bytes = parse_bytes32(record_hash)

    record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == record_hash_bytes
    ).first()

    if not record:
        raise HTTPException(404, "Record not found")

    canonical = json.loads(record.canonical_json)

    children = db.query(PropertyRecord).filter(
        PropertyRecord.parent_record == record.record_hash
    ).all()

    polygon = (
        aggregate_child_polygons(children)
        if record.subdivision_locked and children
        else canonical.get("polygon")
    )

    return {
        "record_hash": "0x" + record.record_hash.hex(),
        "polygon": polygon,
        "area_m2": record.area_m2,
        "is_subdivided": record.subdivision_locked,
        "parent_record": (
            "0x" + record.parent_record.hex()
            if record.parent_record else None
        ),
        "children_records": [
            "0x" + c.record_hash.hex() for c in children
        ],
        "owner_address": record.owner_address,
        "metadata": canonical.get("metadata"),
        "cid": record.cid,
        "created_at": record.created_at,
    }


# ======================================================
# GET /registry/list (PAGINATED)
# ======================================================
@router.get("/list")
def list_records(
    limit: int = 20,
    cursor: str | None = None,
    db: Session = Depends(get_db),
):

    print("\n================ REGISTRY LIST =================")
    print("📥 limit:", limit)
    print("📥 cursor:", cursor)

    query = db.query(PropertyRecord).order_by(PropertyRecord.created_at.desc())

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid cursor format. Use ISO-8601 datetime."
            )

        query = query.filter(PropertyRecord.created_at < cursor_dt)

    records = query.limit(limit + 1).all()

    next_cursor = None
    if len(records) > limit:
        next_cursor = records[-1].created_at.isoformat()
        records = records[:-1]

    print("📦 Records returned:", len(records))
    print("➡️ next_cursor:", next_cursor)
    print("================================================\n")

    return {
        "items": [
            {
                "record_hash": "0x" + r.record_hash.hex(),
                "area_m2": r.area_m2,
                "owner_address": r.owner_address,
                "is_subdivided": r.subdivision_locked,
                "parent_record": (
                    "0x" + r.parent_record.hex()
                    if r.parent_record else None
                ),
                "parcel_type": r.parcel_type,
                "is_transferable": r.is_transferable,
                "created_at": r.created_at,
            }
            for r in records
        ],
        "next_cursor": next_cursor,
    }


# ======================================================
# GET /registry/children/{record_hash}
# ======================================================
@router.get("/children/{record_hash}")
def get_children_records(record_hash: str, db: Session = Depends(get_db)):

    print("\n================ REGISTRY CHILDREN =================")

    clean = record_hash[2:] if record_hash.startswith("0x") else record_hash

    try:
        parent_hash_bytes = bytes.fromhex(clean)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid record_hash")

    children = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.parent_record == parent_hash_bytes)
        .all()
    )

    print("📄 Parent:", clean)
    print("👶 Children found:", len(children))
    print("===================================================\n")

    results = []

    for c in children:
        canonical = json.loads(c.canonical_json)
        polygon = canonical.get("polygon")

        bbox = None
        if polygon:
            lons = [p[0] for p in polygon]
            lats = [p[1] for p in polygon]
            bbox = {
                "min_lon": min(lons),
                "min_lat": min(lats),
                "max_lon": max(lons),
                "max_lat": max(lats),
            }

        results.append({
            "record_hash": "0x" + c.record_hash.hex(),
            "polygon": polygon,
            "bbox": bbox,
            "area_m2": c.area_m2,
            "is_subdivided": c.subdivision_locked,
            "created_at": c.created_at,
        })

    return {
        "parent_record": "0x" + clean,
        "count": len(results),
        "children": results,
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
            "is_subdivided": current.subdivision_locked,
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
