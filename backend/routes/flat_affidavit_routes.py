from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import tempfile, os
from datetime import timezone
from web3 import Web3
from web3_client import w3

from canonicalize import canonicalize_to_bytes
from models import Agreement, FlatUnit, get_db
from affidavit.flat_affidavit_renderer import render_flat_affidavit_pdf
from affidavit.agreement_qr_payload import build_agreement_qr_payload
from config import settings

router = APIRouter(tags=["Flat Affidavit"])


# --------------------------------------------------
# INTERNAL: build canonical flat affidavit (COURT-GRADE)
# --------------------------------------------------
def _build_flat_affidavit(flat: FlatUnit, agreement: Agreement) -> dict:
    affidavit = {
        "type": "FLAT_OWNERSHIP_AFFIDAVIT",
        "schema_version": "1.0.0",
        "network": "Ethereum",
        "chain_id": w3.eth.chain_id,
        "generated_at": agreement.created_at.astimezone(timezone.utc).isoformat(),

        # ---------------- FLAT ----------------
        "flat": {
            "flat_id": str(flat.id),
            "flat_number": flat.flat_number,
            "building_id": str(flat.building_id),
            "land_record_hash": flat.land_record_hash,
            "owner_address": flat.owner_address,
        },

        # ---------------- AGREEMENT ----------------
        "agreement": {
            "agreement_id": str(agreement.id),
            "agreement_hash": "0x" + agreement.agreement_hash.hex(),
            "subject_id": str(flat.id),          
            "subject_type": "FLAT",              
            "activation_tx": agreement.tx_hash,
            "status": agreement.status.name,
            "activated_at": agreement.created_at.astimezone(timezone.utc).isoformat(),
        },

        # ---------------- BLOCKCHAIN ANCHOR ----------------
        "anchoring": {
            "activation_tx": agreement.tx_hash,
        },

        # ---------------- LEGAL AFFIRMATION ----------------
        "affirmation": (
            "This affidavit certifies that the above flat ownership agreement was "
            "created from canonical registry state, cryptographically hashed, and "
            "anchored on the Ethereum blockchain. The agreement reflects legally "
            "binding ownership terms as recorded at the time of activation and is "
            "verifiable through on-chain transaction data and cryptographic proofs."
        ),

        # ---------------- REGISTRAR ----------------
        "registrar_address": settings.REGISTRAR_ADDRESS,

        # Explicit signature state (court required)
        "digital_signature": (
            agreement.registrar_signature
            if getattr(agreement, "registrar_signature", None)
            else "UNSIGNED — REGISTRAR DIGITAL SIGNATURE NOT APPLIED"
        ),
    }

    # ---------------- CANONICAL HASH ----------------
    canonical_bytes = canonicalize_to_bytes(affidavit)
    affidavit_hash = Web3.keccak(canonical_bytes)
    affidavit["affidavit_hash"] = "0x" + affidavit_hash.hex()

    # ---------------- QR PAYLOAD ----------------
    affidavit["qr_payload"] = build_agreement_qr_payload(affidavit)

    return affidavit


# ==================================================
# GET /flat/affidavit/{flat_id}
# → JSON affidavit (machine + audit verifiable)
# ==================================================
@router.get("/{flat_id}")
def get_flat_affidavit_json(
    flat_id: str,
    db: Session = Depends(get_db),
):
    flat = db.query(FlatUnit).get(flat_id)
    if not flat:
        raise HTTPException(status_code=404, detail="Flat not found")

    agreement = (
        db.query(Agreement)
        .filter(
            Agreement.subject_type == "FLAT",
            Agreement.subject_id == str(flat.id),
            Agreement.status == "ACTIVE",
        )
        .first()
    )

    if not agreement:
        raise HTTPException(
            status_code=400,
            detail="No active agreement for flat",
        )

    return _build_flat_affidavit(flat, agreement)


# ==================================================
# GET /flat/affidavit/{flat_id}/pdf
# → Court-grade PDF
# ==================================================
@router.get("/{flat_id}/pdf")
def generate_flat_affidavit_pdf(
    flat_id: str,
    db: Session = Depends(get_db),
):
    flat = db.query(FlatUnit).get(flat_id)
    if not flat:
        raise HTTPException(404, "Flat not found")

    agreement = (
        db.query(Agreement)
        .filter(
            Agreement.subject_type == "FLAT",
            Agreement.subject_id == str(flat.id),
            Agreement.status == "ACTIVE",
        )
        .first()
    )

    if not agreement:
        raise HTTPException(400, "No active agreement for flat")

    affidavit = _build_flat_affidavit(flat, agreement)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp_path = tmp.name
    tmp.close()

    try:
        render_flat_affidavit_pdf(
            affidavit=affidavit,
            output_path=tmp_path,
        )
    except Exception as e:
        # 🔥 CRITICAL: delete broken file
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(
            status_code=500,
            detail=f"PDF rendering failed: {str(e)}",
        )

    # 🔒 Validate PDF size
    if os.path.getsize(tmp_path) < 1024:
        os.unlink(tmp_path)
        raise HTTPException(
            status_code=500,
            detail="Generated PDF is invalid or empty",
        )

    return FileResponse(
        path=tmp_path,
        media_type="application/pdf",
        filename=f"flat_affidavit_{flat_id}.pdf",
        headers={
            "Content-Disposition": (
                f'inline; filename="flat_affidavit_{flat_id}.pdf"'
            )
        },
    )
