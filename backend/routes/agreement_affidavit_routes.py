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

from models import Agreement, get_db
from web3_client import w3
from affidavit.agreement_qr_payload import build_agreement_qr_payload
from affidavit.agreement_renderer import render_agreement_pdf
from routes.agreement_enforcement_routes import enforce_agreement
from canonicalize import canonicalize_to_bytes

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
    affidavit = {
        "type": "AGREEMENT_AFFIDAVIT",
        "schema_version": "1.0.0",
        "system": "Blockchain Land Registry",
        "network": "Ethereum",
        "chain_id": w3.eth.chain_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),

        "agreement": {
            "agreement_id": str(agreement.id),
            "agreement_hash": "0x" + agreement.agreement_hash.hex(),
            "subject_id": agreement.subject_id,
            "subject_type": agreement.subject_type,
            "agreement_type": canonical_terms.get("agreement_type"),
            "status": agreement.status.name,
            "terms": canonical_terms,
        },

        "anchoring": {
            "activation_tx": agreement.tx_hash,
            "activated_at": activated_at,
            "merkle_root": "0x" + root.hex(),
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
    affidavit_hash = "0x" + affidavit_hash_bytes.hex()
    affidavit["affidavit_hash"] = affidavit_hash

    # --------------------------------------------------
    # DIGITAL SIGNATURE (REAL, REGISTRY-GRADE)
    # --------------------------------------------------
    if not settings.REGISTRAR_PRIVATE_KEY:
        raise RuntimeError("Registrar private key not configured")

    msg = encode_defunct(hexstr=affidavit_hash)
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
):
    agreement = db.query(Agreement).get(agreement_id)
    if not agreement:
        raise HTTPException(404, "Agreement not found")

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
