from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import Building, PropertyRecord, get_db
from schemas.building_schema import (
    CreateBuildingRequest,
    BuildingResponse,
)

router = APIRouter(tags=["Building Registry"])


# --------------------------------------------------
# POST /building/create
# --------------------------------------------------
@router.post("/create", response_model=BuildingResponse)
def create_building(req: CreateBuildingRequest, db: Session = Depends(get_db)):

    land = db.query(PropertyRecord).filter(
        PropertyRecord.record_hash == bytes.fromhex(req.land_record_hash[2:])
    ).first()

    if not land:
        raise HTTPException(404, "Land parcel not found")

    if land.subdivision_locked:
        raise HTTPException(400, "Cannot add building to subdivided parcel")

    building = Building(
        land_record_hash=bytes.fromhex(req.land_record_hash[2:]),
        name=req.name,
        total_floors=req.total_floors,
    )

    db.add(building)
    db.commit()
    db.refresh(building)

    return BuildingResponse(
        building_id=str(building.id),
        land_record_hash=req.land_record_hash,
        name=building.name,
        total_floors=building.total_floors,
        created_at=building.created_at,
    )


# --------------------------------------------------
# GET /building/{building_id}
# --------------------------------------------------
@router.get("/{building_id}")
def get_building(building_id: str, db: Session = Depends(get_db)):

    building = db.query(Building).get(building_id)
    if not building:
        raise HTTPException(404, "Building not found")

    return {
        "building_id": str(building.id),
        "land_record_hash": "0x" + building.land_record_hash.hex(),
        "name": building.name,
        "total_floors": building.total_floors,
        "created_at": building.created_at,
    }


# --------------------------------------------------
# GET /building/by-land/{land_record_hash}
# --------------------------------------------------
@router.get("/by-land/{land_record_hash}")
def get_buildings_by_land(
    land_record_hash: str,
    db: Session = Depends(get_db),
):
    try:
        land_hash_bytes = bytes.fromhex(land_record_hash[2:])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid land_record_hash")

    buildings = db.query(Building).filter(
        Building.land_record_hash == land_hash_bytes
    ).all()

    return [
        {
            "building_id": str(b.id),
            "land_record_hash": land_record_hash,
            "name": b.name,
            "total_floors": b.total_floors,
            "created_at": b.created_at,
        }
        for b in buildings
    ]
