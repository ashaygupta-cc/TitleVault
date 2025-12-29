# backend/routes/map_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from shapely.geometry import mapping
from shapely.wkb import loads

from models import PropertyRecord, get_db, Building,FlatUnit


router = APIRouter(
    tags=["Map"]
)


@router.get("/parcel/{record_hash}")
def get_parcel_geojson(record_hash: str, db: Session = Depends(get_db)):

    clean = record_hash[2:] if record_hash.startswith("0x") else record_hash

    record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == bytes.fromhex(clean)
    ).first()

    if not record:
        raise HTTPException(404, "Parcel not found")

    geom = loads(bytes(record.geom.data))

    return {
        "type": "Feature",
        "geometry": mapping(geom),
        "properties": {
            "record_hash": record_hash,
            "area_m2": record.area_m2,
            "parent_record": (
                record.parent_record.hex()
                if record.parent_record else None
            ),
            "is_subdivided": record.subdivision_locked,
            "parcel_type": (
                "RESIDUAL"
                if record.canonical_json and '"type": "RESIDUAL"' in record.canonical_json
                else "STANDARD"
            ),
        }
    }


# --------------------------------------------------
# GET /map/building/{building_id}
# --------------------------------------------------

@router.get("/building/{building_id}")
def get_building_overlay(building_id: str, db: Session = Depends(get_db)):

    building = db.query(Building).get(building_id)
    if not building:
        raise HTTPException(404, "Building not found")

    record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == building.land_record_hash
    ).first()

    if not record or not record.geom:
        raise HTTPException(404, "Land geometry not found")

    geom = loads(bytes(record.geom.data))

    return {
        "building_id": building_id,
        "land_record_hash": "0x" + building.land_record_hash.hex(),
        "geometry": mapping(geom),
        "total_floors": building.total_floors,
        "name": building.name,
    }


# --------------------------------------------------
# GET /map/building/{building_id}/flats
# --------------------------------------------------

@router.get("/building/{building_id}/flats")
def list_flats_for_building(building_id: str, db: Session = Depends(get_db)):

    flats = db.query(FlatUnit).filter(
        FlatUnit.building_id == building_id
    ).all()

    return {
        "building_id": building_id,
        "count": len(flats),
        "flats": [
            {
                "flat_id": str(f.id),
                "flat_number": f.flat_number,
                "floor_number": f.floor_number,
                "area_m2": float(f.area_m2),
                "owner_address": f.owner_address,
                "is_locked": f.is_locked,
            }
            for f in flats
        ]
    }


# --------------------------------------------------
# GET /map/flat/{flat_id}
# --------------------------------------------------
@router.get("/flat/{flat_id}")
def flat_map_context(flat_id: str, db: Session = Depends(get_db)):

    flat = db.query(FlatUnit).get(flat_id)
    if not flat:
        raise HTTPException(404, "Flat not found")

    record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == bytes.fromhex(flat.land_record_hash[2:])
    ).first()

    geom = loads(bytes(record.geom.data))

    return {
        "flat_id": flat_id,
        "building_id": flat.building_id,
        "flat_number": flat.flat_number,
        "floor_number": flat.floor_number,
        "land_geometry": mapping(geom),
    }
