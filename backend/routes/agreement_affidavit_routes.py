from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json
import os
import tempfile
from web3 import Web3
from fastapi.responses import FileResponse

from eth_account import Account
from eth_account.messages import encode_defunct

from models import Agreement, get_db, AuditLog
from web3_client import w3
from affidavit.agreement_qr_payload import build_agreement_qr_payload
from affidavit.agreement_renderer import render_agreement_pdf
from routes.agreement_enforcement_routes import enforce_agreement
from canonicalize import canonicalize_to_bytes
from schemas.affidavit_schema import VerifyAgreementAffidavitSignatureRequest
from deps.auth import get_current_user
from utils.activity_logger import log_user_activity

from merkle.proof import verify_proof, generate_proof
from merkle.utils import agreement_leaf_hash
from merkle.tree import build_merkle_tree
from config import settings


router = APIRouter(tags=["Agreement Affidavit"])


# ------------------------------------------------------
# INTERNAL BUILDER
# ------------------------------------------------------
def _build_agreement_affidavit(
    agreement: Agreement,
    enforcement: dict,
    db: Session
):
    canonical_terms = json.loads(agreement.canonical_json)

    activated_at = (
        agreement.created_at.isoformat()
        if agreement.created_at
        else None
    )

    # --------------------------------------------------
    # MERKLE VERIFICATION (ANCHOR-SAFE)
    # --------------------------------------------------
    anchored_agreements = (
        db.query(Agreement)
        .filter(Agreement.tx_hash.isnot(None))
        .order_by(Agreement.created_at.asc())
        .all()
    )

    if not anchored_agreements:
        raise HTTPException(400, "No anchored agreements found")

    pairs = sorted(
        (
            Web3.keccak(text=a.subject_id),
            a.agreement_hash,
        )
        for a in anchored_agreements
    )

    leaves = [
        agreement_leaf_hash(sid, ah)
        for sid, ah in pairs
    ]

    tree = build_merkle_tree(leaves)
    root = tree[-1][0]

    leaf = agreement_leaf_hash(
        Web3.keccak(text=agreement.subject_id),
        agreement.agreement_hash,
    )

    if leaf not in leaves:
        raise HTTPException(
            400,
            "Agreement not included in anchored Merkle snapshot"
        )

    index = leaves.index(leaf)
    proof = generate_proof(tree, index)

    merkle_valid, computed_root = verify_proof(
        leaf,
        proof,
        index,
        root,
    )

    # --------------------------------------------------
    # AFFIDAVIT BODY
    # --------------------------------------------------
    # Clean hash prefixes to avoid double 0x
    agreement_hash_hex = agreement.agreement_hash.hex()
    agreement_hash_hex = agreement_hash_hex[2:] if agreement_hash_hex.startswith('0x') else agreement_hash_hex
    
    root_hex = root.hex()
    root_hex = root_hex[2:] if root_hex.startswith('0x') else root_hex
    
    affidavit = {
        "type": "AGREEMENT_AFFIDAVIT",
        "schema_version": "1.0.0",
        "system": "Blockchain Land Registry",
        "network": "Ethereum",
        "chain_id": w3.eth.chain_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),

        "agreement": {
            "agreement_id": str(agreement.id),
            "agreement_hash": "0x" + agreement_hash_hex,
            "subject_id": agreement.subject_id,
            "subject_type": agreement.subject_type,
            "agreement_type": canonical_terms.get("agreement_type"),
            "status": agreement.status.name,
            "terms": canonical_terms,
        },

        "anchoring": {
            "activation_tx": agreement.tx_hash,
            "activated_at": activated_at,
            "merkle_root": "0x" + root_hex,
            "merkle_verified": merkle_valid,
            "proof_length": len(proof),
        },

        "enforcement_snapshot": enforcement,

        "registrar_address": settings.REGISTRAR_ADDRESS,
    }

    # --------------------------------------------------
    # CANONICAL HASH
    # --------------------------------------------------
    canonical_bytes = canonicalize_to_bytes(affidavit)
    affidavit_hash_bytes = Web3.keccak(canonical_bytes)
    affidavit_hash_hex = affidavit_hash_bytes.hex()
    affidavit_hash_hex = affidavit_hash_hex[2:] if affidavit_hash_hex.startswith('0x') else affidavit_hash_hex
    affidavit_hash = "0x" + affidavit_hash_hex
    affidavit["affidavit_hash"] = affidavit_hash

    # --------------------------------------------------
    # DIGITAL SIGNATURE (REAL, REGISTRY-GRADE)
    # --------------------------------------------------
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

    # --------------------------------------------------
    # QR PAYLOAD
    # --------------------------------------------------
    affidavit["qr_payload"] = build_agreement_qr_payload(affidavit)

    return affidavit


# ======================================================
# GET JSON
# ======================================================
@router.get("/{agreement_id}")
def get_agreement_affidavit(
    agreement_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    agreement = db.query(Agreement).get(agreement_id)
    if not agreement:
        raise HTTPException(404, "Agreement not found")

    enforcement = enforce_agreement(agreement_id, db)
    return _build_agreement_affidavit(agreement, enforcement, db)


# ======================================================
# GET PDF
# ======================================================
@router.get("/{agreement_id}/pdf")
def get_agreement_affidavit_pdf(
    agreement_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    agreement = db.query(Agreement).get(agreement_id)
    if not agreement:
        raise HTTPException(404, "Agreement not found")

    # Log activity
    if current_user:
        log_user_activity(
            db,
            current_user,
            "downloaded_agreement_affidavit_pdf",
            {"agreement_id": agreement_id}
        )

    enforcement = enforce_agreement(agreement_id, db)
    affidavit = _build_agreement_affidavit(agreement, enforcement, db)

    output_path = os.path.join(
        tempfile.gettempdir(),
        f"agreement_affidavit_{agreement_id}.pdf"
    )

    render_agreement_pdf(affidavit, output_path)

    return FileResponse(
        path=output_path,
        media_type="application/pdf",
        filename=f"agreement_affidavit_{agreement_id}.pdf"
    )

# ======================================================
# VERIFY SIGNATURE
# ======================================================
@router.post("/verify-signature")
def verify_agreement_affidavit_signature(req: VerifyAgreementAffidavitSignatureRequest):
    """
    Verify agreement affidavit signature using ECDSA verification.
    
    The affidavit_hash is already a keccak256 hash, so we just wrap it 
    in the Ethereum message format without re-hashing.
    
    Expected request body:
    {
        "affidavit_hash": "0x...",
        "signature": "0x...",
        "signer": "0x..."
    }
    """
    try:
        # Clean up the affidavit hash - remove double 0x prefix
        hash_str = req.affidavit_hash
        if hash_str.startswith('0x0x'):
            hash_str = '0x' + hash_str[4:]
        elif not hash_str.startswith('0x'):
            hash_str = '0x' + hash_str
        
        # Extract hex part (without 0x prefix)
        hex_part = hash_str[2:] if hash_str.startswith('0x') else hash_str
        
        # The affidavit_hash is already a keccak256 hash
        # Just wrap it in the Ethereum message format (same as signing)
        msg = encode_defunct(hexstr=hex_part)

        # Recover the signer
        recovered = Account.recover_message(
            msg,
            signature=req.signature,
        )

        # Compare addresses (case-insensitive)
        is_valid = recovered.lower() == req.signer.lower()

        return {
            "valid": is_valid,
            "recovered_signer": recovered,
            "expected_signer": req.signer,
        }
    except ValueError as e:
        raise HTTPException(400, f"Invalid signature format: {str(e)}")
    except Exception as e:
        raise HTTPException(400, f"Signature verification failed: {str(e)}")