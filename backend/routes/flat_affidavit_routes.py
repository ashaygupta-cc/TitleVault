from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import tempfile, os
from datetime import timezone
from web3 import Web3
from web3_client import w3

from eth_account import Account
from eth_account.messages import encode_defunct

from canonicalize import canonicalize_to_bytes
from models import Agreement, FlatUnit, get_db, AuditLog
from affidavit.flat_affidavit_renderer import render_flat_affidavit_pdf
from affidavit.agreement_qr_payload import build_agreement_qr_payload
from config import settings
from deps.auth import get_current_user
from utils.activity_logger import log_user_activity

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
            "land_record_hash": (
                "0x" + flat.land_record_hash.hex() 
                if isinstance(flat.land_record_hash, (bytes, bytearray))
                else ("0x" + flat.land_record_hash if isinstance(flat.land_record_hash, str) and not flat.land_record_hash.startswith(('0x', '\\x')) else flat.land_record_hash.replace('\\x', '0x') if isinstance(flat.land_record_hash, str) else flat.land_record_hash)
            ),
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
    }

    # ---------------- CANONICAL HASH ----------------
    canonical_bytes = canonicalize_to_bytes(affidavit)
    affidavit_hash_bytes = Web3.keccak(canonical_bytes)
    affidavit_hash_hex = affidavit_hash_bytes.hex()
    affidavit_hash_hex = affidavit_hash_hex[2:] if affidavit_hash_hex.startswith('0x') else affidavit_hash_hex
    affidavit_hash = "0x" + affidavit_hash_hex
    affidavit["affidavit_hash"] = affidavit_hash

    # ---------------- DIGITAL SIGNATURE (REAL) ----------------
    if not settings.REGISTRAR_PRIVATE_KEY:
        raise RuntimeError("Registrar private key not configured")

    # Strip 0x prefix for encode_defunct
    affidavit_hash_clean = affidavit_hash[2:] if affidavit_hash.startswith('0x') else affidavit_hash
    msg = encode_defunct(hexstr=affidavit_hash_clean)
    signed = Account.sign_message(msg, settings.REGISTRAR_PRIVATE_KEY)

    affidavit["signature"] = {
    "signer": settings.REGISTRAR_ADDRESS,
    "signature": signed.signature.hex(),
    }

    # ---------------- QR PAYLOAD ----------------
    affidavit["qr_payload"] = build_agreement_qr_payload(affidavit)

    return affidavit


# ==================================================
# GET /flat/affidavit/{flat_id}
# ==================================================
@router.get("/{flat_id}")
def get_flat_affidavit_json(flat_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    flat = db.query(FlatUnit).get(flat_id)
    if not flat:
        raise HTTPException(status_code=404, detail="Flat not found")

    agreement = (
        db.query(Agreement)
        .filter(
            Agreement.subject_type == "FLAT",
            Agreement.subject_id == str(flat.id),
            Agreement.status.in_(["ACTIVE", "COMPLETED"]),
        )
        .first()
    )

    if not agreement:
        raise HTTPException(400, "No active or completed agreement for flat")

    return _build_flat_affidavit(flat, agreement)


# ==================================================
# GET /flat/affidavit/{flat_id}/pdf
# ==================================================
@router.get("/{flat_id}/pdf")
def generate_flat_affidavit_pdf(flat_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    flat = db.query(FlatUnit).get(flat_id)
    if not flat:
        raise HTTPException(404, "Flat not found")

    # Log activity
    if current_user:
        log_user_activity(
            db,
            current_user,
            "downloaded_flat_affidavit_pdf",
            {"flat_id": flat_id}
        )

    agreement = (
        db.query(Agreement)
        .filter(
            Agreement.subject_type == "FLAT",
            Agreement.subject_id == str(flat.id),
            Agreement.status.in_(["ACTIVE", "COMPLETED"]),
        )
        .first()
    )

    if not agreement:
        raise HTTPException(400, "No active or completed agreement for flat")

    affidavit = _build_flat_affidavit(flat, agreement)

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp_path = tmp.name
    tmp.close()

    try:
        render_flat_affidavit_pdf(affidavit, tmp_path)
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(500, f"PDF rendering failed: {str(e)}")

    return FileResponse(
        tmp_path,
        media_type="application/pdf",
        filename=f"flat_affidavit_{flat_id}.pdf",
        headers={
            "Content-Disposition": f'inline; filename="flat_affidavit_{flat_id}.pdf"'
        },
    )
