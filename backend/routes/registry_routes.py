from fastapi import APIRouter, HTTPException, Depends, Request
import logging
import asyncio
from sqlalchemy.orm import Session
from shapely.geometry import Polygon as ShapelyPolygon
from datetime import datetime
import json
from sqlalchemy import text, desc
import os
from web3 import Web3
from slowapi import Limiter
from slowapi.util import get_remote_address

from deps.auth import require_admin, get_current_user

from models import PropertyRecord, get_db, MerkleSnapshot, AuditLog
from schemas.registry_schema import (
    CreateRecordRequest,
    CreateRecordResponse,
    TransferRecordRequest,
)
from utils.activity_logger import log_user_activity
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


def ensure_single_0x(hexstr: str) -> str:
    """Remove all 0x prefixes and add one back"""
    while hexstr.startswith("0x"):
        hexstr = hexstr[2:]
    return "0x" + hexstr

router = APIRouter(tags=["registry"])
limiter = Limiter(key_func=get_remote_address)


# ======================================================
# POST /registry/create
# ======================================================
@router.post("/create", response_model=CreateRecordResponse)
@limiter.limit("100/hour")
async def create_record(
    request: Request,
    req: CreateRecordRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin),
):

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
    
    existing = db.query(PropertyRecord).filter(
    PropertyRecord.record_hash == record_hash_bytes
    ).first()

    if existing:
        return {
            "status": "ALREADY_EXISTS",
            "id": str(existing.id),
            "cid": existing.cid,
            "record_hash": record_hash_hex,
            "area_m2": existing.area_m2,
            "tx_hash": None,
        }

    cid = upload_bytes_to_ipfs(canonical_bytes)

    tx_hash = None

    if os.getenv("DISABLE_ONCHAIN", "false").lower() != "true":
        try:
            tx_hash = await asyncio.wait_for(
                asyncio.to_thread(
                    send_create_record_tx,
                    record_hash_hex,
                    cid,
                    req.owner_address,
                    b"",
                ),
                timeout=15,
            )
        except asyncio.TimeoutError:
            logging.error("⏱️ On-chain tx timed out; continuing without tx_hash")
            tx_hash = None
        except Exception:
            logging.exception("On-chain createRecord failed; continuing")
            tx_hash = None
    else:
        logging.info("🚫 DISABLE_ONCHAIN=true → skipping blockchain transaction")


    record = PropertyRecord(
        cid=cid,
        record_hash=record_hash_bytes,
        canonical_hash=record_hash_bytes,
        format="CANONICAL",
        owner_address=req.owner_address,
        canonical_json=canonical_bytes.decode("utf-8"),
        geom=f"SRID=4326;{shapely_poly.wkt}",
        # DB-only fields
        survey_number=getattr(req, "survey_number", None),
        owner_name=getattr(req, "owner_name", None),
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
        "status": "CREATED",
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
@limiter.limit("100/hour")
def transfer_record(
    request: Request,
    req: TransferRecordRequest,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin),
):
    try:
        # Validate inputs
        if not req.old_record_hash:
            raise HTTPException(400, "old_record_hash is required")
        if not req.new_owner_address:
            raise HTTPException(400, "new_owner_address is required")

        print(f"\n[TRANSFER] Starting transfer")
        print(f"[TRANSFER] Old hash: {req.old_record_hash}")
        print(f"[TRANSFER] New owner: {req.new_owner_address}")

        # Parse and validate hash
        try:
            old_hash_bytes = parse_bytes32(req.old_record_hash)
        except Exception as e:
            raise HTTPException(400, f"Invalid record_hash format: {str(e)}")

        # Find old record
        old = db.query(PropertyRecord).filter(
            PropertyRecord.record_hash == old_hash_bytes
        ).first()

        if not old:
            raise HTTPException(404, "Original record not found")

        # Check locks
        if is_subject_locked_on_chain(req.old_record_hash, False):
            raise HTTPException(409, "Record locked under active agreement")

        if old.subdivision_locked:
            raise HTTPException(400, "Cannot transfer subdivided parent record")

        # Parse old data
        try:
            old_data = json.loads(old.canonical_json)
        except Exception as e:
            raise HTTPException(400, f"Failed to parse old record canonical_json: {str(e)}")

        print(f"[TRANSFER] Old data keys: {old_data.keys()}")
        print(f"[TRANSFER] Old data: {json.dumps(old_data, default=str)}")

        # If this is a child record (subdivision), get polygon and metadata from parent
        if "polygon" not in old_data and old.parent_record:
            parent = db.query(PropertyRecord).filter(
                PropertyRecord.record_hash == old.parent_record
            ).first()
            
            if parent:
                parent_data = json.loads(parent.canonical_json)
                if "polygon" in parent_data:
                    old_data["polygon"] = parent_data["polygon"]
                    print(f"[TRANSFER] Loaded polygon from parent")
                if "metadata" not in old_data and "metadata" in parent_data:
                    old_data["metadata"] = parent_data["metadata"]
                    print(f"[TRANSFER] Loaded metadata from parent")

        # Use provided metadata if present, otherwise use old metadata
        metadata = req.metadata if req.metadata else old_data.get("metadata", {})

        print(f"[TRANSFER] Old metadata: {old_data.get('metadata')}")
        print(f"[TRANSFER] New metadata: {metadata}")

        # Ensure polygon exists
        if "polygon" not in old_data:
            raise HTTPException(400, f"Old record missing polygon data. Keys available: {list(old_data.keys())}")

        record_json = {
            "owner": req.new_owner_address,
            "metadata": metadata,
            "polygon": old_data["polygon"],
        }

        print(f"[TRANSFER] Record JSON: {json.dumps(record_json, default=str)}")

        # Canonicalize
        try:
            canonical_bytes = canonicalize_to_bytes(record_json)
            new_hash_hex = compute_keccak256_from_bytes(canonical_bytes)
            new_hash_hex = ensure_single_0x(new_hash_hex)
        except Exception as e:
            raise HTTPException(400, f"Failed to canonicalize record: {str(e)}")

        print(f"[TRANSFER] New hash: {new_hash_hex}")

        try:
            new_hash_bytes = parse_bytes32(new_hash_hex)
        except Exception as e:
            raise HTTPException(400, f"Invalid generated hash: {str(e)}")

        # IPFS upload
        try:
            cid = upload_bytes_to_ipfs(canonical_bytes)
        except Exception as e:
            print(f"[TRANSFER] IPFS upload error: {str(e)}")
            cid = None

        # On-chain transaction
        try:
            tx_hash = send_transfer_record_tx(
                old_record_hash_hex=req.old_record_hash,
                new_record_hash_hex=new_hash_hex,
                cid=cid or "",
                new_owner=req.new_owner_address,
                registrar_sig=b"",
            )
        except Exception as e:
            print(f"[TRANSFER] On-chain error: {str(e)}")
            raise HTTPException(400, f"Failed to send on-chain transaction: {str(e)}")

        # Create new record
        new_record = PropertyRecord(
            cid=cid,
            record_hash=new_hash_bytes,
            canonical_hash=new_hash_bytes,
            format="CANONICAL",
            owner_address=req.new_owner_address,
            canonical_json=canonical_bytes.decode("utf-8"),
            geom=old.geom,
            area_m2=old.area_m2,
            survey_number=old.survey_number,
            owner_name=old.owner_name,
            parent_record=old.record_hash,
        )

        db.add(new_record)
        db.commit()

        print(f"[TRANSFER] Transfer completed successfully\n")

        return {
            "old_record_hash": req.old_record_hash,
            "new_record_hash": new_hash_hex,
            "new_owner_address": req.new_owner_address,
            "cid": cid,
            "tx_hash": tx_hash,
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[TRANSFER] Unexpected error: {str(e)}")
        raise HTTPException(500, f"Transfer failed: {str(e)}")


# ======================================================
# GET /registry/verify/{record_hash}
# ======================================================
@router.get("/verify/{record_hash}")
def verify_record(record_hash: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

    record_hash_bytes = parse_bytes32(record_hash)
    clean = record_hash_bytes.hex()
    
    # Log activity - only for verification, not for generic viewing
    if current_user:
        log_user_activity(
            db,
            current_user,
            "verified_registry_record",
            {"record_hash": record_hash}
        )
    
    print(f"\n[DEBUG VERIFY] Starting verify_record for hash: {clean}", flush=True)

    db_record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == record_hash_bytes
    ).first()
    
    print(f"[DEBUG VERIFY] Found db_record: {db_record is not None}", flush=True)

    if not db_record:
        print(f"[DEBUG VERIFY] Record not found, returning NOT_FOUND", flush=True)
        return {
            "record_hash": "0x" + clean,
            "status": "NOT_FOUND",
            "db_exists": False,
            "ipfs_exists": False,
            "blockchain_exists": False,
        }

    if db_record.subdivision_locked:
        print(f"[DEBUG VERIFY] Record is subdivided_parent, but still returning verification details", flush=True)
        # Even for subdivided records, return verification details
        try:
            fetch_raw_from_ipfs(db_record.cid)
            ipfs_exists = True
        except Exception:
            ipfs_exists = False

        # Fetch blockchain data
        owner, cid, timestamp, registrar, registrar_sig, parent_hash, _ = \
            get_record_from_chain("0x" + clean)
        blockchain_exists = timestamp != 0
        
        # Check if there's an anchored Merkle root that includes this record
        merkle_anchored = False
        if not blockchain_exists:
            print(f"[DEBUG VERIFY] blockchain_exists=False, checking merkle snapshots...", flush=True)
            try:
                latest_snapshot = (
                    db.query(MerkleSnapshot)
                    .filter(MerkleSnapshot.tx_hash != None)
                    .order_by(desc(MerkleSnapshot.anchored_at))
                    .first()
                )
                if latest_snapshot and latest_snapshot.tx_hash:
                    merkle_anchored = True
                    blockchain_exists = True
                    print(f"[DEBUG VERIFY] Found anchored merkle root", flush=True)
            except Exception as e:
                print(f"[DEBUG VERIFY] Error checking merkle snapshot: {e}", flush=True)

        # Still check the canonical hash
        canonical_bytes = db_record.canonical_json.encode("utf-8")
        print(f"[DEBUG] canonical_json string (first 100 chars): {str(db_record.canonical_json)[:100]}", flush=True)
        calculated_hash_bytes = Web3.keccak(canonical_bytes)
        print(f"[DEBUG] calculated_hash_bytes.hex(): {calculated_hash_bytes.hex()}", flush=True)
        hash_match = calculated_hash_bytes == db_record.canonical_hash
        
        stored_display = "0x" + db_record.canonical_hash.hex()
        calc_hex = calculated_hash_bytes.hex()
        # Ensure no double 0x prefix
        if calc_hex.startswith("0x"):
            calc_display = calc_hex
        else:
            calc_display = "0x" + calc_hex
        
        # Check blockchain matches
        owner_match = owner.lower() == db_record.owner_address.lower()
        cid_match = cid == db_record.cid
        parent_match = (
            (db_record.parent_record is None and parent_hash == b"\x00" * 32)
            or (
                db_record.parent_record is not None
                and parent_hash == db_record.parent_record
            )
        )
        
        response = {
            "record_hash": "0x" + clean,
            "status": "SUBDIVIDED_PARENT",
            "db_exists": True,
            "ipfs_exists": ipfs_exists,
            "blockchain_exists": blockchain_exists,
            "hash_match": hash_match,
            "merkle_anchored": merkle_anchored,
            "is_legacy": False,
            "stored_canonical_hash": stored_display,
            "calculated_canonical_hash": calc_display,
        }
        
        # Always include blockchain matches when blockchain_exists
        if blockchain_exists:
            response.update({
                "parent_match": parent_match,
                "cid_match": cid_match,
                "owner_match": owner_match,
            })
        
        print(f"[DEBUG VERIFY] Subdivided parent response: blockchain_exists={blockchain_exists}, merkle_anchored={merkle_anchored}", flush=True)
        return response

    print(f"[DEBUG VERIFY] Checking IPFS...", flush=True)
    try:
        fetch_raw_from_ipfs(db_record.cid)
        ipfs_exists = True
    except Exception as e:
        print(f"[DEBUG VERIFY] IPFS fetch failed: {e}", flush=True)
        ipfs_exists = False

    print(f"[DEBUG VERIFY] Fetching from blockchain...", flush=True)
    owner, cid, timestamp, registrar, registrar_sig, parent_hash, _ = \
        get_record_from_chain("0x" + clean)

    blockchain_exists = timestamp != 0
    
    # Check if there's an anchored Merkle root that includes this record
    # This is for when merkle root is anchored but individual records aren't
    merkle_anchored = False
    if not blockchain_exists:
        print(f"[DEBUG VERIFY] blockchain_exists=False, checking merkle snapshots...", flush=True)
        try:
            latest_snapshot = (
                db.query(MerkleSnapshot)
                .filter(MerkleSnapshot.tx_hash != None)  # Has been anchored
                .order_by(desc(MerkleSnapshot.anchored_at))
                .first()
            )
            if latest_snapshot and latest_snapshot.tx_hash:
                # Merkle root is anchored on blockchain
                merkle_anchored = True
                blockchain_exists = True
                print(f"[DEBUG VERIFY] Found anchored merkle root", flush=True)
        except Exception as e:
            print(f"[DEBUG VERIFY] Error checking merkle snapshot: {e}", flush=True)
    
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
    print(f"[DEBUG GET] canonical_json string (first 100 chars): {str(db_record.canonical_json)[:100]}", flush=True)
    calculated_hash_bytes = Web3.keccak(canonical_bytes)
    print(f"[DEBUG GET] calculated_hash_bytes.hex(): {calculated_hash_bytes.hex()}", flush=True)
    
    # Compare bytes directly (most reliable)
    hash_match = calculated_hash_bytes == db_record.canonical_hash
    
    # For display, format both as hex with 0x prefix
    stored_display = "0x" + db_record.canonical_hash.hex()
    calc_hex = calculated_hash_bytes.hex()
    # Ensure no double 0x prefix
    if calc_hex.startswith("0x"):
        calc_display = calc_hex
    else:
        calc_display = "0x" + calc_hex
    
    # Debug: log hash mismatch
    if not hash_match:
        print(f"[DEBUG] Hash mismatch for record {clean}")
        print(f"  Stored:     {stored_display}")
        print(f"  Calculated: {calc_display}")
        print(f"  JSON length: {len(db_record.canonical_json)}")

    # Determine status based on data availability and consistency
    # A record is VERIFIED if:
    # 1. It exists in the database AND IPFS (always required)
    # 2. AND one of the following:
    #    a) It's anchored on blockchain with all fields matching
    #    b) OR it's part of an anchored Merkle root tree
    #    c) OR it's in canonical state (pre-anchor)
    status = "NOT_FOUND"
    if db_record and ipfs_exists:
        if merkle_anchored:
            # Merkle root is anchored, record is part of the tree
            if hash_match:
                status = "VERIFIED"  # Anchored via Merkle root
            else:
                status = "TAMPERED"
        elif blockchain_exists:
            # On-chain data exists - all checks must pass
            if owner_match and cid_match and parent_match and hash_match:
                status = "VERIFIED"
            else:
                status = "TAMPERED"
        else:
            # No on-chain data yet (not anchored)
            # Still verify if canonical hash matches to ensure data integrity
            if hash_match:
                status = "VERIFIED"  # Valid canonical record, not yet anchored
            else:
                status = "TAMPERED"  # Data mismatch even without on-chain
    else:
        status = "NOT_FOUND"

    # Build response with conditional match fields
    response = {
        "record_hash": "0x" + clean,
        "status": status,
        "db_exists": True,
        "ipfs_exists": ipfs_exists,
        "blockchain_exists": blockchain_exists,
        "hash_match": hash_match,
        "merkle_anchored": merkle_anchored,
        "is_legacy": False,
        "stored_canonical_hash": stored_display,
        "calculated_canonical_hash": calc_display,
    }
    
    # Only include blockchain-dependent matches if blockchain_exists
    # Include them even for merkle-rooted records for data integrity verification
    if blockchain_exists:
        response.update({
            "parent_match": parent_match,
            "cid_match": cid_match,
            "owner_match": owner_match,
        })
    
    # DEBUG: Log the response
    print(f"[DEBUG] Verify record response for {clean}:")
    print(f"  blockchain_exists={blockchain_exists}, merkle_anchored={merkle_anchored}")
    print(f"  hash_match={hash_match}")
    print(f"  Response keys: {list(response.keys())}")
    print(f"  Full response: {response}", flush=True)
    
    return response


# ======================================================
# GET /registry/record/{record_hash}
# ======================================================
@router.get("/record/{record_hash}")
def get_record_details(record_hash: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):

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
        "is_transferable": record.is_transferable,
        "parent_record": (
            "0x" + record.parent_record.hex()
            if record.parent_record else None
        ),
        "children_records": [
            "0x" + c.record_hash.hex() for c in children
        ],
        "owner_address": record.owner_address,
        "owner_name": record.owner_name,
        "survey_number": record.survey_number,
        "metadata": canonical.get("metadata"),
        "cid": record.cid,
        "created_at": record.created_at,
    }


# Helper function to get metadata from record or parent
def _get_record_metadata(record: PropertyRecord, db: Session) -> dict:
    """Extract metadata from record, falling back to parent if needed"""
    try:
        if record.canonical_json:
            data = json.loads(record.canonical_json)
            metadata = data.get("metadata")
            if metadata:
                return metadata
    except Exception:
        pass
    
    # If no metadata in record and it has a parent, try parent
    if record.parent_record:
        try:
            parent = db.query(PropertyRecord).filter(
                PropertyRecord.record_hash == record.parent_record
            ).first()
            if parent and parent.canonical_json:
                parent_data = json.loads(parent.canonical_json)
                metadata = parent_data.get("metadata")
                if metadata:
                    return metadata
        except Exception:
            pass
    
    return {}


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
                "id": str(r.id),
                "record_hash": "0x" + r.record_hash.hex(),
                "area_m2": r.area_m2,
                "owner_address": r.owner_address,
                "owner_name": r.owner_name,
                "survey_number": r.survey_number,
                "is_subdivided": r.subdivision_locked,
                "parent_record": (
                    "0x" + r.parent_record.hex()
                    if r.parent_record else None
                ),
                "parcel_type": r.parcel_type,
                "is_transferable": r.is_transferable,
                "created_at": r.created_at,
                "metadata": _get_record_metadata(r, db),
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
