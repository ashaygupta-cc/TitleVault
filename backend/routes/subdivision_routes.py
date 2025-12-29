# backend/routes/subdivision_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from shapely.geometry import Polygon
from shapely.ops import unary_union
import json

from models import PropertyRecord, get_db
from schemas.subdivision_schema import SubdivideRequest
from utils.bytes32 import to_bytes32
from utils.polygon_validation import validate_subdivision
from utils.area import geodesic_area_m2

from canonicalize import canonicalize_to_bytes, compute_keccak256_from_bytes
from ipfs_client import upload_bytes_to_ipfs
from web3_client import send_subdivide_record_tx


router = APIRouter(tags=["Subdivision"])

AREA_TOLERANCE = 0.99  # ≥99% conservation


@router.post("/subdivide")
def subdivide_record(req: SubdivideRequest, db: Session = Depends(get_db)):

    parent = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == to_bytes32(req.parent_record_hash)
    ).first()

    if not parent:
        raise HTTPException(404, "Parent record not found")

    if parent.subdivision_locked:
        raise HTTPException(400, "Record already subdivided")

    parent_polygon = Polygon(json.loads(parent.canonical_json)["polygon"])
    parent_area = geodesic_area_m2(parent_polygon)

    # --- Build child polygons
    child_polys = [Polygon(c.polygon) for c in req.children]

    # --- Geometry validation (containment + non-self-intersection)
    validate_subdivision(
        parent_polygon.exterior.coords,
        [c.polygon for c in req.children]
    )

    # --- Area validation
    union_geom = unary_union(child_polys)
    union_area = geodesic_area_m2(union_geom)

    if union_area > parent_area * 1.01:
        raise HTTPException(
            400,
            "Invalid subdivision: child parcels overlap or exceed parent area"
        )

    if union_area < parent_area * AREA_TOLERANCE:
        residual_required = True
    else:
        residual_required = False

    created_children = []

    # --- Create child parcels
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
        record_hash = compute_keccak256_from_bytes(canonical)
        cid = upload_bytes_to_ipfs(canonical)

        send_subdivide_record_tx(
            req.parent_record_hash,
            record_hash,
            cid,
            parent.owner_address,
        )

        db.add(PropertyRecord(
            record_hash=to_bytes32(record_hash),
            canonical_hash=to_bytes32(record_hash),
            format="CANONICAL",
            owner_address=parent.owner_address,
            cid=cid,
            canonical_json=canonical.decode(),
            geom=f"SRID=4326;{poly.wkt}",
            area_m2=area,
            parent_record=parent.record_hash,
        ))

        created_children.append(record_hash)

    # --- Residual parcel (Option B)
    residual_hash = None

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
            residual_hash = compute_keccak256_from_bytes(canonical)
            cid = upload_bytes_to_ipfs(canonical)

            send_subdivide_record_tx(
                req.parent_record_hash,
                residual_hash,
                cid,
                parent.owner_address,
            )

            db.add(PropertyRecord(
                record_hash=to_bytes32(residual_hash),
                canonical_hash=to_bytes32(residual_hash),
                format="CANONICAL",
                owner_address=parent.owner_address,
                cid=cid,
                canonical_json=canonical.decode(),
                geom=f"SRID=4326;{residual_geom.wkt}",
                area_m2=residual_area,
                parent_record=parent.record_hash,
            ))

    parent.subdivision_locked = True
    db.commit()

    return {
        "status": "OK",
        "parent_record": req.parent_record_hash,
        "children_created": len(created_children),
        "residual_created": residual_required,
        "residual_record_hash": residual_hash,
    }
