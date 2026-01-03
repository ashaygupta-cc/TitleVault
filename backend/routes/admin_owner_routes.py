from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import OwnerProfile
from models import get_db

router = APIRouter(tags=["Admin"])


@router.post("/admin/owner")
def upsert_owner_profile(
    address: str,
    display_name: str,
    db: Session = Depends(get_db),
):
    profile = db.query(OwnerProfile).filter(
        OwnerProfile.address == address
    ).first()

    if profile:
        profile.display_name = display_name
    else:
        profile = OwnerProfile(
            address=address,
            display_name=display_name,
        )
        db.add(profile)

    db.commit()

    return {
        "address": address,
        "display_name": display_name,
    }
