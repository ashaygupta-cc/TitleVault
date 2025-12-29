from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from shapely.geometry import Polygon as ShapelyPolygon
import json

from deps.auth import require_admin
from models import PropertyRecord, get_db
from schemas.subdivision_schema import SubdivideRequest

from canonicalize import (
    canonicalize_to_bytes,
    compute_keccak256_from_bytes,
)

from ipfs_client import upload_bytes_to_ipfs
from web3_client import send_subdivide_record_tx

from utils.bytes32 import to_bytes32
from utils.polygon_validation import validate_subdivision


router = APIRouter(
    prefix="/registry",
    tags=["Subdivision"]
)


@router.post("/subdivide")
def subdivide_record(
    req: SubdivideRequest,
    db: Session = Depends(get_db),
):
    print("\n=========== SUBDIVISION START ===========")

    parent = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == to_bytes32(req.parent_record_hash)
    ).first()

    if not parent:
        raise HTTPException(404, "Parent record not found")

    if parent.subdivision_locked:
        raise HTTPException(400, "Record already subdivided")

    # ---- validate geometry integrity
    validate_subdivision(
        json.loads(parent.canonical_json)["polygon"],
        [c.polygon for c in req.children]
    )

    # ---- create child records
    for child in req.children:
        canonical_bytes = canonicalize_to_bytes(child.dict())
        child_hash_hex = compute_keccak256_from_bytes(canonical_bytes)
        cid = upload_bytes_to_ipfs(canonical_bytes)

        send_subdivide_record_tx(
            parent_record_hash=req.parent_record_hash,
            child_record_hash=child_hash_hex,
            cid=cid,
            owner=parent.owner_address,
        )

        db.add(
            PropertyRecord(
                record_hash=to_bytes32(child_hash_hex),
                canonical_hash=to_bytes32(child_hash_hex),
                format="CANONICAL",
                owner_address=parent.owner_address,
                cid=cid,
                canonical_json=canonical_bytes.decode("utf-8"),
                geom=f"SRID=4326;{ShapelyPolygon(child.polygon).wkt}",
                parent_record=parent.record_hash,
            )
        )

    parent.subdivision_locked = True
    db.commit()

    print("✅ SUBDIVISION COMPLETE")

    return {
        "status": "OK",
        "parent_record": req.parent_record_hash,
        "children_created": len(req.children),
    }
