from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from models import PropertyRecord, FlatUnit, get_db
from schemas.flat_schema import CreateFlatRequest, FlatResponse
from canonicalize import canonicalize_to_bytes, compute_keccak256_from_bytes

router = APIRouter(tags=["Flat Registry"])


# --------------------------------------------------
# POST /flat/create
# --------------------------------------------------
@router.post("/create", response_model=FlatResponse)
def create_flat(req: CreateFlatRequest, db: Session = Depends(get_db)):

    land = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == bytes.fromhex(req.land_record_hash[2:])
    ).first()

    if not land:
        raise HTTPException(404, "Land parcel not found")

    if land.subdivision_locked:
        raise HTTPException(400, "Cannot add flats to subdivided parcel")

    canonical_flat = {
        "building_id": str(req.building_id),
        "land_record_hash": req.land_record_hash,
        "flat_number": req.flat_number,
        "floor_number": req.floor_number,
        "area_m2": float(req.area_m2),
        "is_transferable": req.is_transferable,
    }

    flat_hash_hex = compute_keccak256_from_bytes(
        canonicalize_to_bytes(canonical_flat)
    )

    flat = FlatUnit(
        flat_hash=bytes.fromhex(flat_hash_hex[2:]),
        building_id=req.building_id,
        land_record_hash=bytes.fromhex(req.land_record_hash[2:]),
        flat_number=req.flat_number,
        floor_number=req.floor_number,
        owner_address=req.owner_address,
        area_m2=req.area_m2,
        is_transferable=req.is_transferable,
        is_locked=False,
    )

    db.add(flat)
    db.commit()
    db.refresh(flat)

    land_hash = (
        "0x" + flat.land_record_hash.hex()
        if isinstance(flat.land_record_hash, (bytes, bytearray))
        else flat.land_record_hash
    )

    return FlatResponse(
        flat_id=str(flat.id),
        flat_hash="0x" + flat.flat_hash.hex(),
        building_id=str(flat.building_id),
        land_record_hash=land_hash,
        owner_address=flat.owner_address,
        area_m2=float(flat.area_m2),
        is_transferable=flat.is_transferable,
        is_locked=flat.is_locked,
        created_at=flat.created_at,
    )


# --------------------------------------------------
# GET /flat/{flat_id}
# --------------------------------------------------
@router.get("/{flat_id}", response_model=FlatResponse)
def get_flat(flat_id: str, db: Session = Depends(get_db)):

    flat = db.query(FlatUnit).get(flat_id)
    if not flat:
        raise HTTPException(404, "Flat not found")

    land_hash = (
        "0x" + flat.land_record_hash.hex()
        if isinstance(flat.land_record_hash, (bytes, bytearray))
        else flat.land_record_hash
    )

    return FlatResponse(
        flat_id=str(flat.id),
        flat_hash="0x" + flat.flat_hash.hex(),
        building_id=str(flat.building_id),
        land_record_hash=land_hash,
        owner_address=flat.owner_address,
        area_m2=float(flat.area_m2),
        is_transferable=flat.is_transferable,
        is_locked=flat.is_locked,
        created_at=flat.created_at,
    )


# --------------------------------------------------
# GET /flat/by-building/{building_id}
# --------------------------------------------------
@router.get("/by-building/{building_id}")
def list_flats_by_building(building_id: str, db: Session = Depends(get_db)):

    try:
        building_uuid = UUID(building_id)
    except ValueError:
        raise HTTPException(400, "Invalid building_id")

    flats = db.query(FlatUnit).filter(
        FlatUnit.building_id == building_uuid
    ).all()

    return {
        "building_id": building_id,
        "count": len(flats),
        "flats": [
            {
                "flat_id": str(f.id),
                "flat_number": f.flat_number,
                "floor_number": f.floor_number,
                "owner_address": f.owner_address,
                "area_m2": float(f.area_m2),
                "is_locked": f.is_locked,
            }
            for f in flats
        ],
    }


# --------------------------------------------------
# GET /flat/by-land/{record_hash}
# --------------------------------------------------
@router.get("/by-land/{record_hash}")
def list_flats_by_land(record_hash: str, db: Session = Depends(get_db)):

    flats = db.query(FlatUnit).filter(
        FlatUnit.land_record_hash == bytes.fromhex(record_hash[2:])
    ).all()

    return {
        "land_record": record_hash,
        "count": len(flats),
        "flats": [
            {
                "flat_id": str(f.id),
                "building_id": str(f.building_id),
                "flat_number": f.flat_number,
                "floor_number": f.floor_number,
                "owner_address": f.owner_address,
                "area_m2": float(f.area_m2),
                "is_locked": f.is_locked,
            }
            for f in flats
        ],
    }
