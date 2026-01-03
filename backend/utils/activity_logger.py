"""Activity logging utility"""
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from models import AuditLog


def log_user_activity(
    db: Session,
    user_dict: dict,
    action: str,
    metadata: dict = None,
    record_hash: bytes = None,
):
    """
    Log user activity to audit_logs table
    
    Args:
        db: Database session
        user_dict: JWT payload dict with "sub" key containing user_id
        action: Action name (e.g., "verified_registry_affidavit")
        metadata: Optional metadata dict
        record_hash: Optional record hash bytes
    """
    if not user_dict:
        print("[ACTIVITY] user_dict is None, skipping activity log")
        return
    
    try:
        user_id_str = user_dict.get("sub")
        if not user_id_str:
            print("[ACTIVITY] No 'sub' in user_dict, skipping activity log")
            return
        
        user_id = UUID(user_id_str)
        
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            metadata_json=metadata or {},
            record_hash=record_hash,
        )
        
        db.add(audit_log)
        db.commit()
        
        print(f"[ACTIVITY LOG] {action} logged for user {user_id_str}")
        
    except Exception as e:
        print(f"[ACTIVITY LOG ERROR] Failed to log {action}: {e}")
        import traceback
        traceback.print_exc()
