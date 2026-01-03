from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class ActivityLogItem(BaseModel):
    id: str
    action: str
    timestamp: datetime
    metadata: Optional[dict[str, Any]] = None

    class Config:
        from_attributes = True


class UserActivityResponse(BaseModel):
    items: list[ActivityLogItem]
    total: int

    class Config:
        from_attributes = True
