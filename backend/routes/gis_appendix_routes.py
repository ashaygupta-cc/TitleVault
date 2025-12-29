# backend/routes/gis_appendix_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from shapely.wkb import loads
from models import PropertyRecord, get_db

router = APIRouter(tags=["Court GIS Appendix"])


@router.get("/gis/{record_hash}")
def gis_appendix(record_hash: str, db: Session = Depends(get_db)):
    clean = record_hash[2:] if record_hash.startswith("0x") else record_hash

    try:
        record_hash_bytes = bytes.fromhex(clean)
    except ValueError:
        raise HTTPException(422, "Invalid record hash format")

    record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == record_hash_bytes
    ).first()

    if not record:
        raise HTTPException(404, "Property record not found")

    if not record.geom:
        raise HTTPException(404, "No geometry stored for this record")

    geom = loads(bytes(record.geom.data))

    return {
        "record_hash": record_hash,
        "geometry_wkt": geom.wkt,
        "area_m2": record.area_m2,
        "parent_record": (
            record.parent_record.hex()
            if record.parent_record
            else None
        ),
        "note": (
            "This appendix is a technical geospatial representation "
            "intended to accompany legal affidavits."
        ),
    }
