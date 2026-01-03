def ensure_single_0x(hexstr: str) -> str:
    while hexstr.startswith("0x"):
        hexstr = hexstr[2:]
    return "0x" + hexstr
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from shapely.geometry import Polygon
from shapely.ops import unary_union
import json

from models import PropertyRecord, get_db
from schemas.subdivision_schema import SubdivideRequest
from utils.bytes32 import parse_bytes32
from utils.polygon_validation import validate_subdivision
from utils.area import geodesic_area_m2
from canonicalize import canonicalize_to_bytes, compute_keccak256_from_bytes
from ipfs_client import upload_bytes_to_ipfs
from web3_client import send_subdivide_record_tx, is_subject_locked_on_chain

router = APIRouter(tags=["Subdivision"])

AREA_TOLERANCE = 0.99  # ≥99% conservation


@router.post("/subdivide")
def subdivide_record(req: SubdivideRequest, db: Session = Depends(get_db)):


    # Debug: print the parent_record_hash value and length
    print(f"[DEBUG] Received parent_record_hash: '{req.parent_record_hash}' (length: {len(req.parent_record_hash)})")

    # ✅ STRICT parse (NO padding)
    parent_hash_bytes = parse_bytes32(req.parent_record_hash)

    parent = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == parent_hash_bytes
    ).first()

    if not parent:
        raise HTTPException(404, "Parent record not found")

    # 🔒 Agreement lock enforcement
    if is_subject_locked_on_chain(req.parent_record_hash, False):
        raise HTTPException(409, "Record locked under active agreement")

    if parent.subdivision_locked:
        raise HTTPException(400, "Record already subdivided")

    canonical_parent = json.loads(parent.canonical_json)
    parent_polygon = Polygon(canonical_parent["polygon"])
    parent_area = geodesic_area_m2(parent_polygon)

    child_polys = [Polygon(c.polygon) for c in req.children]

    try:
        validate_subdivision(
            parent_polygon.exterior.coords,
            [c.polygon for c in req.children]
        )
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))

    union_geom = unary_union(child_polys)
    union_area = geodesic_area_m2(union_geom)

    if union_area > parent_area * 1.01:
        raise HTTPException(400, "Child parcels exceed parent area")

    residual_required = union_area < parent_area * AREA_TOLERANCE

    created_children = []

    # ======================================================
    # CHILD PARCELS
    # ======================================================
    for child, poly in zip(req.children, child_polys):
        area = geodesic_area_m2(poly)

        payload = {
            "polygon": child.polygon,
            "metadata": child.metadata,
            "area_m2": area,
            "parent": req.parent_record_hash,
            "type": "CHILD",
        }

        canonical = canonicalize_to_bytes(payload)
        record_hash_hex = compute_keccak256_from_bytes(canonical)
        record_hash_hex = ensure_single_0x(record_hash_hex)
        record_hash_bytes = parse_bytes32(record_hash_hex)

        cid = upload_bytes_to_ipfs(canonical)

        send_subdivide_record_tx(
            req.parent_record_hash,
            record_hash_hex,
            cid,
            parent.owner_address,
        )

        db.add(PropertyRecord(
            record_hash=record_hash_bytes,
            canonical_hash=record_hash_bytes,
            format="CANONICAL",
            owner_address=parent.owner_address,
            cid=cid,
            canonical_json=canonical.decode("utf-8"),
            geom=f"SRID=4326;{poly.wkt}",
            area_m2=area,
            parent_record=parent.record_hash,
            is_transferable=True,
        ))

        created_children.append(record_hash_hex)

    # ======================================================
    # RESIDUAL PARCEL (IF ANY)
    # ======================================================
    residual_hash_hex = None

    if residual_required:
        residual_geom = parent_polygon.difference(union_geom)

        if not residual_geom.is_empty:
            residual_area = geodesic_area_m2(residual_geom)

            payload = {
                "type": "RESIDUAL",
                "area_m2": residual_area,
                "parent": req.parent_record_hash,
                "transferable": False,
            }

            canonical = canonicalize_to_bytes(payload)
            residual_hash_hex = compute_keccak256_from_bytes(canonical)
            residual_hash_hex = ensure_single_0x(residual_hash_hex)
            residual_hash_bytes = parse_bytes32(residual_hash_hex)

            cid = upload_bytes_to_ipfs(canonical)

            send_subdivide_record_tx(
                req.parent_record_hash,
                residual_hash_hex,
                cid,
                parent.owner_address,
            )

            db.add(PropertyRecord(
                record_hash=residual_hash_bytes,
                canonical_hash=residual_hash_bytes,
                format="CANONICAL",
                owner_address=parent.owner_address,
                cid=cid,
                canonical_json=canonical.decode("utf-8"),
                geom=f"SRID=4326;{residual_geom.wkt}",
                area_m2=residual_area,
                parent_record=parent.record_hash,
                is_transferable=False,
            ))

    parent.subdivision_locked = True
    db.commit()

    return {
        "status": "OK",
        "parent_record": req.parent_record_hash,
        "children_created": len(created_children),
        "residual_created": residual_required,
        "residual_record_hash": residual_hash_hex,
    }
