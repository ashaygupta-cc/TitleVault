# backend/schemas/gis_audit_schema.py

from pydantic import BaseModel

class GISAuditResponse(BaseModel):
    record_hash: str
    area_m2: float
    polygon_wkt: str
    parent_record: str | None
