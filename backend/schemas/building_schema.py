from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreateBuildingRequest(BaseModel):
    land_record_hash: str
    name: str
    total_floors: int


class BuildingResponse(BaseModel):
    building_id: str
    land_record_hash: str

    name: str
    total_floors: int

    created_at: Optional[datetime]
