from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models import Agreement, FlatUnit, get_db
from routes.registry_affidavit_routes import generate_affidavit
from routes.agreement_affidavit_routes import _build_agreement_affidavit
from routes.flat_affidavit_routes import _build_flat_affidavit
from routes.agreement_enforcement_routes import enforce_agreement
from deps.auth import get_current_user
from utils.activity_logger import log_user_activity


router = APIRouter(tags=["Court Affidavit"])



def normalize_registry_affidavit(raw: dict) -> dict:
    proof = raw.get("merkle_proof", {})
    record = raw.get("record")

    if not record:
        raise HTTPException(500, "Missing record in affidavit")

    return {
        "type": "COURT_AFFIDAVIT",

        # 🆔 document identity
        "affidavit_id": raw.get("affidavit_hash"),

        # 🏛️ legal entity
        "parcel_id": record.get("parcel_id"),

        # 🔐 crypto
        "record_hash": record["record_hash"],
        "owner": record.get("owner_address"),
        "area": f'{raw.get("geometry", {}).get("area_m2", "-")} m²',

        "anchored_at": raw.get("anchoring", {}).get("anchored_at"),
        "merkle_root": raw.get("anchoring", {}).get("root"),
        "block_number": raw.get("anchoring", {}).get("block_number"),
        "tx_hash": raw.get("anchoring", {}).get("tx_hash"),

        # ✅ NEVER assume signature exists
        "signature": raw.get("signature", {}).get("signature"),

        "proof_path": [
            {
                "hash": proof["proof"][i],
                "direction": proof["proof_direction"][i],
                "index": i,
            }
            for i in range(len(proof.get("proof", [])))
        ],
    }


def normalize_agreement_affidavit(raw: dict) -> dict:
    agreement = raw.get("agreement") or {}
    anchoring = raw.get("anchoring") or {}

    terms = agreement.get("terms") or {}

    buyer = terms.get("buyer")
    seller = terms.get("seller")

    if not buyer or not seller:
        raise HTTPException(
            500,
            "Buyer/Seller missing in agreement terms"
        )

    return {
        "type": "COURT_AFFIDAVIT",
        "subject_type": "AGREEMENT",

        # IDs
        "agreement_id": agreement.get("agreement_id"),
        "subject_id": agreement.get("subject_id"),

        # Cryptographic identity
        "agreement_hash": agreement.get("agreement_hash"),

        # Parties (✅ CORRECT SOURCE)
        "buyer": buyer,
        "seller": seller,

        # Anchoring
        "anchoring": {
            "merkle_root": anchoring.get("merkle_root"),
            "tx_hash": anchoring.get("activation_tx"),
            "activated_at": anchoring.get("activated_at"),
        },
    }




def normalize_flat_affidavit(raw: dict) -> dict:
    flat = raw["flat"]
    agreement = raw["agreement"]

    return {
        "type": "COURT_AFFIDAVIT",

        # 🆔 DOCUMENT ID
        "affidavit_id": raw["affidavit_hash"],

        # 🏛️ LEGAL ENTITY
        "flat_id": flat["flat_id"],

        # 🔐 CRYPTO
        "record_hash": raw["affidavit_hash"],

        "owner": flat["owner_address"],

        "anchored_at": agreement["activated_at"],
        "merkle_root": agreement["merkle_root"],
        "block_number": None,
        "tx_hash": agreement["activation_tx"],
        "signature": raw.get("signature", {}).get("signature"),

        "proof_path": [],
    }



@router.get("/affidavit")
def get_court_affidavit(
    record_hash: str | None = None,
    agreement_id: str | None = None,
    flat_id: str | None = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    # Log activity
    if current_user:
        action = "viewed_court_affidavit_registry"
        metadata = {}
        if record_hash:
            action = "viewed_court_affidavit_registry"
            metadata = {"record_hash": record_hash}
        elif agreement_id:
            action = "viewed_court_affidavit_agreement"
            metadata = {"agreement_id": agreement_id}
        elif flat_id:
            action = "viewed_court_affidavit_flat"
            metadata = {"flat_id": flat_id}
        
        log_user_activity(
            db,
            current_user,
            action,
            metadata
        )
    # -------------------------------
    # REGISTRY AFFIDAVIT
    # -------------------------------
    if record_hash:
        raw = generate_affidavit(record_hash, db)
        return normalize_registry_affidavit(raw)

    # -------------------------------
    # AGREEMENT AFFIDAVIT
    # -------------------------------
    if agreement_id:
        agreement = db.query(Agreement).get(agreement_id)

        if not agreement:
            raise HTTPException(404, "Agreement not found")

        raw = _build_agreement_affidavit(
            agreement=agreement,
            enforcement=None,
            db=db
        )

        return normalize_agreement_affidavit(raw)

    # -------------------------------
    # FLAT AFFIDAVIT
    # -------------------------------
    if flat_id:
        flat = db.query(FlatUnit).get(flat_id)
        if not flat:
            raise HTTPException(404, "Flat not found")

        agreement = db.query(Agreement).filter(
            Agreement.subject_type == "FLAT",
            Agreement.subject_id == flat.id,
            Agreement.status == "ACTIVE",
        ).first()

        if not agreement:
            raise HTTPException(404, "No active agreement for flat")

        raw = _build_flat_affidavit(flat, agreement)
        return normalize_flat_affidavit(raw)

    # -------------------------------
    raise HTTPException(400, "One identifier required")
