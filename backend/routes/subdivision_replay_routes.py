from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from shapely.ops import unary_union
from models import PropertyRecord, get_db
from utils.area import geodesic_area_m2
from shapely.wkb import loads

router = APIRouter(tags=["Subdivision Replay"])


@router.get("/subdivision/{parent_hash}")
def replay_subdivision(parent_hash: str, db: Session = Depends(get_db)):

    parent = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == bytes.fromhex(parent_hash[2:])
    ).first()

    children = db.query(PropertyRecord).filter(
        PropertyRecord.parent_record == parent.record_hash
    ).all()

    parent_geom = loads(bytes(parent.geom.data))
    child_geoms = [loads(bytes(c.geom.data)) for c in children]

    union = unary_union(child_geoms)

    return {
        "parent_area": geodesic_area_m2(parent_geom),
        "children_union_area": geodesic_area_m2(union),
        "difference_m2": geodesic_area_m2(parent_geom) - geodesic_area_m2(union),
        "tolerance_ok": geodesic_area_m2(union) >= geodesic_area_m2(parent_geom) * 0.99
    }
