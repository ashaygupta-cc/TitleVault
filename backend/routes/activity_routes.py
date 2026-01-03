from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID

from models import AuditLog, get_db
from schemas.activity_schema import UserActivityResponse, ActivityLogItem
from deps.auth import get_current_user

router = APIRouter(prefix="/activity", tags=["activity"])


# ======================================================
# GET /activity/my-activity - User's own activity logs
# ======================================================
@router.get("/my-activity", response_model=UserActivityResponse)
def get_my_activity(
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's activity logs"""
    if not current_user:
        print("[ACTIVITY] current_user is None")
        return UserActivityResponse(items=[], total=0)
    
    user_id_str = current_user.get("sub")
    print(f"[ACTIVITY] Fetching activities for user_id string: {user_id_str}")
    
    try:
        user_id_uuid = UUID(user_id_str)
        print(f"[ACTIVITY] Converted to UUID: {user_id_uuid}")
    except Exception as e:
        print(f"[ACTIVITY] Failed to convert user_id to UUID: {e}")
        return UserActivityResponse(items=[], total=0)
    
    total = db.query(AuditLog).filter(AuditLog.user_id == user_id_uuid).count()
    print(f"[ACTIVITY] Found {total} activities for user {user_id_uuid}")
    
    logs = db.query(AuditLog)\
        .filter(AuditLog.user_id == user_id_uuid)\
        .order_by(desc(AuditLog.timestamp))\
        .limit(limit)\
        .offset(offset)\
        .all()
    
    print(f"[ACTIVITY] Returning {len(logs)} logs")
    for log in logs:
        print(f"  - {log.action} at {log.timestamp}")
    
    items = [
        ActivityLogItem(
            id=str(log.id),
            action=log.action,
            timestamp=log.timestamp,
            metadata=log.metadata_json or {}
        )
        for log in logs
    ]
    
    return UserActivityResponse(items=items, total=total)


# ======================================================
# POST /activity/log - Log an action (internal use)
# ======================================================
@router.post("/log")
def log_action(
    action: str,
    metadata: dict = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log an action for the current user (internal use)"""
    if not current_user:
        raise HTTPException(401, "Authentication required")
    
    user_id_str = current_user.get("sub")
    try:
        user_id_uuid = UUID(user_id_str)
    except:
        raise HTTPException(400, "Invalid user_id")
    
    log = AuditLog(
        user_id=user_id_uuid,
        action=action,
        metadata_json=metadata or {}
    )
    
    db.add(log)
    db.commit()
    
    return {"message": "Activity logged"}


# ======================================================
# GET /activity/debug - Debug endpoint
# ======================================================
@router.get("/debug/all-activities")
def debug_all_activities(db: Session = Depends(get_db)):
    """Debug endpoint - returns ALL activities in database"""
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(100).all()
    
    result = {
        "total": len(logs),
        "activities": [
            {
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "metadata": log.metadata_json
            }
            for log in logs
        ]
    }
    
    return result
