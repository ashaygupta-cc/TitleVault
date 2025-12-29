from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from models import Agreement, get_db

router = APIRouter(tags=["Agreement Enforcement"])


@router.get("/enforce/{agreement_id}")
def enforce_agreement(
    agreement_id: str,
    db: Session = Depends(get_db),
):
    agreement = db.query(Agreement).get(agreement_id)

    if not agreement:
        raise HTTPException(404, "Agreement not found")

    # -----------------------------
    # Handle NON-ACTIVE agreements
    # -----------------------------
    if agreement.status != "ACTIVE":
        return {
            "agreement_id": agreement_id,
            "status": (
                agreement.status.value
                if hasattr(agreement.status, "value")
                else str(agreement.status)
            ),
            "enforceable": False,
            "reason": "Agreement not active",
        }

    # -----------------------------
    # Canonical terms
    # -----------------------------
    canonical = json.loads(agreement.canonical_json)

    schedule = canonical.get("schedule", [])
    paid_upfront = canonical.get("paid_upfront", 0)
    total_price = canonical.get("total_price", 0)

    # -----------------------------
    # Safe activation time handling
    # -----------------------------
    if not agreement.created_at:
        activated_at = datetime.now(timezone.utc)
    else:
        activated_at = agreement.created_at.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    elapsed_days = (now - activated_at).days

    # -----------------------------
    # Payment enforcement logic
    # -----------------------------
    due_amount = paid_upfront
    due_installments = []

    for item in schedule:
        if elapsed_days >= item["due_in_days"]:
            due_amount += item["amount"]
            due_installments.append(item)

    return {
        "agreement_id": agreement_id,
        "subject_id": agreement.subject_id,
        "elapsed_days": elapsed_days,
        "total_price": total_price,
        "paid_upfront": paid_upfront,
        "amount_due_till_now": due_amount,
        "installments_due": due_installments,
        "default_risk": due_amount > paid_upfront,
        "enforceable": True,
    }
