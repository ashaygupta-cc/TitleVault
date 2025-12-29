from pydantic import BaseModel, Field
from typing import List, Dict


class Polygon(BaseModel):
    coordinates: List[List[float]] = Field(
        ..., description="List of [lng, lat] pairs forming a closed polygon"
    )


class CreateRecordRequest(BaseModel):
    owner_address: str
    metadata: Dict
    polygon: Polygon


class CreateRecordResponse(BaseModel):
    id: str
    cid: str
    record_hash: str
    area_m2: float


class TransferRecordRequest(BaseModel):
    old_record_hash: str
    new_owner_address: str
    metadata: Dict
