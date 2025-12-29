from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreateFlatRequest(BaseModel):
    land_record_hash: str
    building_id: str

    flat_number: str
    floor_number: Optional[str] = None

    owner_address: str
    area_m2: float

    is_transferable: bool = True



class FlatResponse(BaseModel):
    flat_id: str
    flat_hash: str
    building_id: str

    land_record_hash: str
    owner_address: str
    area_m2: float

    is_transferable: bool
    is_locked: bool

    created_at: Optional[datetime]
