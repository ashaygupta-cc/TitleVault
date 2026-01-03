from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class Polygon(BaseModel):
    coordinates: List[List[float]] = Field(
        ..., description="List of [lng, lat] pairs forming a closed polygon"
    )


class CreateRecordRequest(BaseModel):
    owner_address: str
    metadata: Dict
    polygon: Polygon
    # DB-only fields (not sent to blockchain/canonical_json)
    survey_number: str = None
    owner_name: str = None


class CreateRecordResponse(BaseModel):
    id: str
    cid: str
    record_hash: str
    area_m2: float


class TransferRecordRequest(BaseModel):
    old_record_hash: str
    new_owner_address: str
    metadata: Optional[Dict] = None
