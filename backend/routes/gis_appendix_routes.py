from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from shapely.wkb import loads
from models import PropertyRecord, get_db

router = APIRouter(tags=["Court GIS Appendix"])


@router.get("/gis/{record_hash}")
def gis_appendix(record_hash: str, db: Session = Depends(get_db)):
    record = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == bytes.fromhex(record_hash[2:])
    ).first()

    geom = loads(bytes(record.geom.data))

    return {
        "record_hash": record_hash,
        "geometry_wkt": geom.wkt,
        "area_m2": record.area_m2,
        "parent_record": record.parent_record.hex() if record.parent_record else None,
        "note": (
            "This appendix is a technical geospatial representation "
            "intended to accompany legal affidavits."
        )
    }
