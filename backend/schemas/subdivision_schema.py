from pydantic import BaseModel, Field
from typing import List


class SubdivisionChild(BaseModel):
    polygon: List[List[float]] = Field(
        ...,
        description="Closed polygon coordinates [[lon, lat], ...]"
    )
    metadata: dict | None = Field(
        default=None,
        description="Optional metadata for the child parcel"
    )


class SubdivideRequest(BaseModel):
    parent_record_hash: str = Field(
        ...,
        description="Hex hash of the parent record (0x...)"
    )
    owner_address: str = Field(
        ...,
        description="Owner address (must match parent owner)"
    )
    children: List[SubdivisionChild] = Field(
        ...,
        description="List of subdivision child parcels"
    )
