from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from web3 import Web3

from eth_account import Account
from eth_account.messages import encode_defunct
from eth_keys.exceptions import BadSignature

from sqlalchemy import desc
from datetime import datetime, timezone


from affidavit.renderer import render_affidavit_pdf
from affidavit.hash import compute_affidavit_hash
from affidavit.signature import sign_affidavit_hash
from schemas.affidavit_schema import VerifyAffidavitSignatureRequest,VerifyFullRequest

from merkle.utils import (
    build_merkle_tree,
    get_merkle_root,
    generate_proof,
    merkle_leaf_hash
)
from fastapi.responses import FileResponse
from pathlib import Path


router = APIRouter(tags=["Affidavit"])


@router.get("/verify")
def verify_affidavit_by_hash(
    record_hash: str = Query(...),
    db: Session = Depends(get_db)
):
    print("\n================ AFFIDAVIT VERIFY START ================")

    clean = record_hash.strip()
    if clean.startswith("0x"):
        clean = clean[2:]

    if len(clean) != 64:
        raise HTTPException(400, "Invalid record_hash length")

    record_hash_bytes = bytes.fromhex(clean)

    record = (
        db.query(PropertyRecord)
        .filter(
            PropertyRecord.record_hash == record_hash_bytes,
            PropertyRecord.format == "CANONICAL"
        )
        .first()
    )

    if not record:
        return {"verified": False, "reason": "Record not found"}

    if record.subdivision_locked:
        return {
            "verified": False,
            "reason": "Record has been subdivided",
            "status": "SUBDIVIDED_PARENT"
        }

    snapshot = (
        db.query(MerkleSnapshot)
        .order_by(MerkleSnapshot.anchored_at.desc())
        .first()
    )

    if not snapshot:
        return {"verified": False, "reason": "No anchored Merkle root"}

    return {
        "verified": True,
        "record_hash": "0x" + clean,
        "anchored_root": Web3.to_hex(snapshot.root),
        "anchored_at": snapshot.anchored_at.isoformat(),
    }



@router.get("/{record_hash}")
def generate_affidavit(record_hash: str, db: Session = Depends(get_db)):
    clean = record_hash[2:] if record_hash.startswith("0x") else record_hash

    try:
        record_hash_bytes = bytes.fromhex(clean)
    except ValueError:
        raise HTTPException(400, "Invalid record_hash")

    record = (
        db.query(PropertyRecord)
        .filter(
            PropertyRecord.record_hash == record_hash_bytes,
            PropertyRecord.format == "CANONICAL",
        )
        .first()
    )
    if not record:
        raise HTTPException(404, "Canonical record not found")

    snapshot = (
        db.query(MerkleSnapshot)
        .order_by(desc(MerkleSnapshot.anchored_at))
        .first()
    )
    if not snapshot:
        raise HTTPException(400, "No anchored Merkle snapshot")

    # ---- rebuild Merkle tree (canonical ordering)
    records = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.format == "CANONICAL")
        .order_by(PropertyRecord.record_hash)
        .all()
    )

    leaves = []
    index = None

    for i, r in enumerate(records):
        leaf = merkle_leaf_hash(
            r.record_hash,
            r.canonical_hash,
            r.parent_record,
        )
        leaves.append(leaf)
        if r.record_hash == record_hash_bytes:
            index = i

    if index is None:
        raise HTTPException(500, "Record missing from Merkle tree")

    tree = build_merkle_tree(leaves)
    root = get_merkle_root(tree)

    if root != snapshot.root:
        raise HTTPException(409, "Merkle root mismatch with anchored snapshot")

    proof = generate_proof(tree, index)

    ok, _ = verify_proof(
        leaf=leaves[index],
        proof=proof,
        index=index,
        expected_root=snapshot.root,
    )
    if not ok:
        raise HTTPException(500, "Internal Merkle verification failed")

    # ---- build affidavit (UNSIGNED)
    affidavit = {
        "system": "Blockchain Land Registry",
        "network": "Ethereum Sepolia",
        "generated_at": datetime.now(timezone.utc).isoformat(),

        "record": {
            "record_hash": Web3.to_hex(record.record_hash),
            "canonical_hash": Web3.to_hex(record.canonical_hash),
            "cid": record.cid,
            "owner_address": record.owner_address,
            "parent_record": (
                Web3.to_hex(record.parent_record)
                if record.parent_record else None
            ),
        },

        "merkle_proof": {
            "leaf": Web3.to_hex(leaves[index]),
            "index": index,
            "proof": [Web3.to_hex(p) for p in proof],
        },

        "anchoring": {
            "root": Web3.to_hex(snapshot.root),
            "tx_hash": snapshot.tx_hash,
            "block_number": snapshot.block_number,
            "anchored_at": snapshot.anchored_at.isoformat(),
        },

        "verification": {
            "hash_function": "keccak256",
            "valid": True,
        },

        "affirmation": (
            "I affirm that the above Merkle inclusion proof was generated "
            "automatically from the canonical registry state and "
            "cryptographically verifies inclusion of the record in the "
            "anchored Merkle root on Ethereum."
        ),
    }

    # ---- Phase 3 (CORRECT): hash + sign
    affidavit_hash = compute_affidavit_hash(affidavit)
    signature = sign_affidavit_hash(affidavit_hash)

    affidavit["affidavit_hash"] = affidavit_hash
    affidavit["signature"] = signature

    return affidavit


@router.get("/{record_hash}/pdf")
def download_affidavit_pdf(record_hash: str, db: Session = Depends(get_db)):
    affidavit = generate_affidavit(record_hash, db)

    tmp_dir = Path(__file__).resolve().parent.parent / "tmp"
    tmp_dir.mkdir(exist_ok=True)

    safe = record_hash.replace("0x", "")
    pdf_path = tmp_dir / f"affidavit_{safe}.pdf"

    render_affidavit_pdf(affidavit, str(pdf_path))

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="land_registry_affidavit.pdf",
    )


@router.post("/verify-signature")
def verify_affidavit_signature(req: VerifyAffidavitSignatureRequest):
    msg_hash = Web3.solidity_keccak(
        ["bytes32"],
        [bytes.fromhex(req.affidavit_hash[2:])],
    )

    eth_message = encode_defunct(primitive=msg_hash)

    recovered = Account.recover_message(
        eth_message,
        signature=req.signature,
    )

    return {
        "valid": recovered.lower() == req.signer.lower(),
        "recovered_signer": recovered,
        "expected_signer": req.signer,
    }




@router.post("/verify/full")
def verify_full_affidavit(
    req: VerifyFullRequest,
    db: Session = Depends(get_db)
):
    print("\n================ FULL VERIFICATION START ================")

    # ---------- 1️⃣ Normalize record_hash ----------
    print("📥 record_hash (raw):", req.record_hash)

    clean = req.record_hash.strip()
    if clean.startswith("0x"):
        clean = clean[2:]

    print("🧹 record_hash (clean):", clean)
    print("📏 record_hash length:", len(clean))

    if len(clean) != 64:
        print("❌ Invalid record_hash length")
        print("========================================================\n")
        return {
            "verified": False,
            "checks": {"record_exists": False},
            "reason": "Invalid record_hash length"
        }

    try:
        record_hash_bytes = bytes.fromhex(clean)
    except ValueError as e:
        print("❌ record_hash hex decode failed:", str(e))
        print("========================================================\n")
        return {
            "verified": False,
            "checks": {"record_exists": False},
            "reason": "Invalid record_hash hex"
        }

    print("🔢 record_hash_bytes:", record_hash_bytes.hex())

    # ---------- 2️⃣ Fetch canonical record ----------
    print("🗄️ Querying DB for canonical record...")

    record = (
        db.query(PropertyRecord)
        .filter(
            PropertyRecord.record_hash == record_hash_bytes,
            PropertyRecord.format == "CANONICAL"
        )
        .first()
    )

    if record.subdivision_locked:
        return {
            "verified": False,
            "reason": "Record has been subdivided",
            "status": "SUBDIVIDED_PARENT"
        }

    if not record:
        print("❌ Record NOT FOUND or NOT CANONICAL")
        print("========================================================\n")
        return {
            "verified": False,
            "checks": {"record_exists": False}
        }

    print("✅ Record FOUND")
    print("   • record_hash     :", record.record_hash.hex())
    print("   • canonical_hash  :", record.canonical_hash.hex())
    print("   • owner_address   :", record.owner_address)

    # ---------- 3️⃣ Fetch latest Merkle snapshot ----------
    print("🌳 Fetching latest Merkle snapshot...")

    snapshot = (
        db.query(MerkleSnapshot)
        .order_by(MerkleSnapshot.anchored_at.desc())
        .first()
    )

    if not snapshot:
        print("❌ No Merkle snapshot found")
        print("========================================================\n")
        return {
            "verified": False,
            "checks": {
                "record_exists": True,
                "canonical": True,
                "anchored": False
            }
        }

    print("✅ Merkle snapshot FOUND")
    print("   • root        :", snapshot.root.hex())
    print("   • tx_hash     :", snapshot.tx_hash)
    print("   • block       :", snapshot.block_number)
    print("   • anchored_at :", snapshot.anchored_at.isoformat())

    # ---------- 4️⃣ Rebuild Merkle tree ----------
    print("🌲 Rebuilding Merkle tree...")

    records = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.format == "CANONICAL")
        .order_by(PropertyRecord.record_hash)
        .all()
    )

    leaves = []
    index = None

    for i, r in enumerate(records):
        leaf = merkle_leaf_hash(
            r.record_hash,
            r.canonical_hash,
            r.parent_record,
        )
        leaves.append(leaf)

        if r.record_hash == record_hash_bytes:
            index = i

    if index is None:
        print("❌ Record missing from Merkle tree")
        print("========================================================\n")
        return {
            "verified": False,
            "checks": {
                "record_exists": True,
                "canonical": True,
                "merkle_proof": False
            }
        }

    print("📍 Record index in tree:", index)
    print("🧩 Leaf hash:", leaves[index].hex())

    tree = build_merkle_tree(leaves)

    # ---------- 5️⃣ Verify Merkle proof ----------
    merkle_valid, computed_root = verify_proof(
        leaf=leaves[index],
        proof=generate_proof(tree, index),
        index=index,
        expected_root=snapshot.root,
    )

    print("🔎 Merkle proof valid:", merkle_valid)
    print("🧮 Computed root:", computed_root.hex())
    print("🎯 Expected root:", snapshot.root.hex())

    # ---------- 6️⃣ Verify signature ----------
    print("✍️ Verifying affidavit signature...")
    print("   • affidavit_hash :", req.affidavit_hash)
    print("   • signer         :", req.signer)

    signature_valid = False
    recovered = None

    try:
        msg_hash = Web3.solidity_keccak(
            ["bytes32"],
            [bytes.fromhex(req.affidavit_hash[2:])],
        )

        eth_message = encode_defunct(primitive=msg_hash)

        recovered = Account.recover_message(
            eth_message,
            signature=req.signature,
        )

        print("   • recovered signer :", recovered)

        signature_valid = recovered.lower() == req.signer.lower()

    except BadSignature:
        print("❌ BadSignature exception")
        signature_valid = False

    except ValueError as e:
        print("❌ Signature decode error:", str(e))
        signature_valid = False

    print("🔐 Signature valid:", signature_valid)

    # ---------- 7️⃣ Final verdict ----------
    verified = merkle_valid and signature_valid

    print("📊 CHECK SUMMARY")
    print("   • record_exists : True")
    print("   • canonical     : True")
    print("   • anchored      : True")
    print("   • merkle_proof  :", merkle_valid)
    print("   • signature     :", signature_valid)

    print("🎯 FULL VERIFICATION RESULT:", verified)
    print("========================================================\n")

    return {
        "verified": verified,
        "checks": {
            "record_exists": True,
            "canonical": True,
            "anchored": True,
            "merkle_proof": merkle_valid,
            "signature_valid": signature_valid,
        },
        "anchored_root": Web3.to_hex(snapshot.root),
        "block_number": snapshot.block_number,
        "anchored_at": snapshot.anchored_at.isoformat(),
    }
