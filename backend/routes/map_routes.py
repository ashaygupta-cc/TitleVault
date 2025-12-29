# backend/routes/map_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from shapely.geometry import mapping
from shapely.wkb import loads

from models import PropertyRecord, get_db


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
