from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from web3 import Web3

from eth_account import Account
from eth_account.messages import encode_defunct
from eth_keys.exceptions import BadSignature

from sqlalchemy import desc
from datetime import datetime, timezone

from models import PropertyRecord, get_db, MerkleSnapshot
from merkle.proof import verify_proof,verify_proof_with_trace
from merkle.utils import (
    build_merkle_tree,
    get_merkle_root,
    generate_proof,
    merkle_leaf_hash
)
from schemas.merkle_schema import (
    MerkleRootResponse,
    MerkleProofResponse,
    MerkleVerifyRequest,
    MerkleVerifyResponse,
    MerkleVerifyPublicResponse,
    MerkleVerifyPublicRequest
)

from web3_client import w3
from chain.merkle_anchor import anchor_merkle_root

from affidavit.renderer import render_affidavit_pdf
from affidavit.hash import compute_affidavit_hash
from affidavit.signature import sign_affidavit_hash
from schemas.affidavit_schema import VerifyAffidavitSignatureRequest,VerifyFullRequest


from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter(tags=["Merkle"])


@router.get("/root", response_model=MerkleRootResponse)
def get_root(db: Session = Depends(get_db)):
    records = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.format == "CANONICAL")
        .order_by(PropertyRecord.record_hash)
        .all()
    )

    if not records:
        return {"merkle_root": None, "count": 0}

    leaves = [
        merkle_leaf_hash(
            r.record_hash,
            r.canonical_hash,
            r.parent_record
        )
        for r in records
    ]

    tree = build_merkle_tree(leaves)
    root = get_merkle_root(tree)

    return {
        "merkle_root": Web3.to_hex(root),
        "count": len(leaves),
    }


@router.get("/proof/{record_hash}", response_model=MerkleProofResponse)
def get_proof(record_hash: str, db: Session = Depends(get_db)):
    clean = record_hash[2:] if record_hash.startswith("0x") else record_hash

    try:
        target = bytes.fromhex(clean)
    except ValueError:
        raise HTTPException(400, "Invalid record_hash hex")

    records = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.format == "CANONICAL")
        .order_by(PropertyRecord.record_hash)
        .all()
    )

    leaves = []
    index = None

    for i, r in enumerate(records):
        print(i, r.record_hash.hex())
        leaf = merkle_leaf_hash(
            r.record_hash,
            r.canonical_hash,
            r.parent_record
        )
        leaves.append(leaf)

        if r.record_hash == target:
            index = i

    if index is None:
        raise HTTPException(404, "Record not found in canonical set")

    tree = build_merkle_tree(leaves)
    proof = generate_proof(tree, index)
    root = get_merkle_root(tree)

    print("🧩 LEAF (proof endpoint):", leaf.hex())

    return {
        "record_hash": Web3.to_hex(target),
        "index": index,
        "proof": [Web3.to_hex(p) for p in proof],
        "root": Web3.to_hex(root),
    }


@router.post("/anchor")
def anchor_current_root(db: Session = Depends(get_db)):
    records = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.format == "CANONICAL")
        .order_by(PropertyRecord.record_hash)
        .all()
    )

    if not records:
        raise HTTPException(400, "No canonical records to anchor")

    # 1️⃣ Build Merkle tree
    leaves = [
        merkle_leaf_hash(
            r.record_hash,
            r.canonical_hash,
            r.parent_record
        )
        for r in records
    ]

    tree = build_merkle_tree(leaves)
    root_bytes = get_merkle_root(tree)
    root_hex = Web3.to_hex(root_bytes)

    # 2️⃣ Anchor on chain
    tx_hash = anchor_merkle_root(root_hex)

    # 3️⃣ WAIT for receipt (this is critical)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    # 4️⃣ Persist snapshot in DB ✅
    snapshot = MerkleSnapshot(
        root=root_bytes,
        tx_hash=tx_hash,
        block_number=receipt.blockNumber,
    )

    db.add(snapshot)
    db.commit()

    return {
        "root": root_hex,
        "tx_hash": tx_hash,
        "block_number": receipt.blockNumber,
    }


@router.post("/verify-internal")
def verify_merkle_proof(
    req: MerkleVerifyRequest,
    db: Session = Depends(get_db)
):
    # 1. Normalize record hash
    clean = req.record_hash[2:] if req.record_hash.startswith("0x") else req.record_hash
    record_hash_bytes = bytes.fromhex(clean)

    # 2. Fetch canonical record from DB
    record = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.record_hash == record_hash_bytes)
        .first()
    )

    if not record:
        raise HTTPException(404, "Record not found")

    # 3. Recompute leaf EXACTLY like tree build
    leaf = merkle_leaf_hash(
        record.record_hash,
        record.canonical_hash,
        record.parent_record
    )

    # 4. Verify proof — DEBUG MODE

    print("\n================ MERKLE VERIFY DEBUG ================")

    print("📌 record_hash      :", record.record_hash.hex())
    print("📌 canonical_hash   :", record.canonical_hash.hex())
    print("📌 parent_record    :", record.parent_record.hex() if record.parent_record else "ZERO32")

    print("🧩 LEAF (computed)  :", leaf.hex())

    print("📍 index            :", req.index)
    print("📍 expected_root    :", req.root)

    print("📍 proof elements:")
    for i, p in enumerate(req.proof):
        print(f"   [{i}]", p)

    print("----------------------------------------------------")

    is_valid, computed_root = verify_proof(
        leaf=leaf,
        proof=[bytes.fromhex(p[2:]) for p in req.proof],
        index=req.index,
        expected_root=bytes.fromhex(req.root[2:])
    )

    print("🧮 computed_root    :", computed_root.hex())
    print("✅ expected_root    :", req.root[2:])
    print("🎯 VALID            :", is_valid)

    print("====================================================\n")

    return {
        "valid": is_valid,
        "computed_root": Web3.to_hex(computed_root),
        "expected_root": req.root
    }



@router.post("/verify", response_model=MerkleVerifyPublicResponse)
def verify_merkle_public(req: MerkleVerifyPublicRequest):
    leaf = bytes.fromhex(req.leaf[2:])
    proof = [bytes.fromhex(p[2:]) for p in req.proof]
    root = bytes.fromhex(req.root[2:])

    is_valid, computed = verify_proof(
        leaf=leaf,
        proof=proof,
        index=req.index,
        expected_root=root
    )

    return {
        "valid": is_valid,
        "computed_root": Web3.to_hex(computed)
    }


@router.post("/verify-fraud")
def verify_merkle_fraud(req: MerkleVerifyPublicRequest):
    result = verify_proof_with_trace(
        leaf=bytes.fromhex(req.leaf[2:]),
        proof=[bytes.fromhex(p[2:]) for p in req.proof],
        index=req.index,
        expected_root=bytes.fromhex(req.root[2:])
    )
    return result


@router.get("/snapshots")
def list_merkle_snapshots(
    limit: int = Query(5, le=50),
    cursor: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(MerkleSnapshot).order_by(
        MerkleSnapshot.anchored_at.desc()
    )

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid cursor timestamp format. Use ISO-8601."
            )

        query = query.filter(MerkleSnapshot.anchored_at < cursor_dt)

    snapshots = query.limit(limit + 1).all()

    next_cursor = None
    if len(snapshots) > limit:
        next_cursor = snapshots[-1].anchored_at.isoformat()
        snapshots = snapshots[:-1]

    return {
        "items": [
            {
                "root": Web3.to_hex(s.root),
                "tx_hash": s.tx_hash,
                "block_number": s.block_number,
                "anchored_at": s.anchored_at.isoformat(),
            }
            for s in snapshots
        ],
        "next_cursor": next_cursor,
    }



@router.get("/affidavit/verify")
def verify_affidavit_by_hash(
    record_hash: str = Query(...),
    db: Session = Depends(get_db)
):
    print("\n================ AFFIDAVIT VERIFY START ================")

    # 1️⃣ Raw input
    print("📥 Raw record_hash input:", repr(record_hash))

    # 2️⃣ Normalize
    clean = record_hash.strip()
    if clean.startswith("0x"):
        clean = clean[2:]

    print("🧹 Normalized hex (no 0x):", clean)
    print("📏 Hex length:", len(clean))

    # 3️⃣ Convert to bytes
    try:
        record_hash_bytes = bytes.fromhex(clean)
    except ValueError as e:
        print("❌ Hex decode failed:", str(e))
        raise HTTPException(400, "Invalid record_hash format")

    print("🔢 record_hash_bytes:", record_hash_bytes.hex())

    # 4️⃣ Query DB
    print("🗄️ Querying DB for canonical record...")
    record = (
        db.query(PropertyRecord)
        .filter(
            PropertyRecord.record_hash == record_hash_bytes,
            PropertyRecord.format == "CANONICAL"
        )
        .first()
    )

    if not record:
        print("❌ Record NOT FOUND or NOT CANONICAL")
        print("========================================================\n")
        return {
            "verified": False,
            "reason": "Record not found or not canonical"
        }

    print("✅ Record FOUND")
    print("   • DB record_hash :", record.record_hash.hex())
    print("   • format         :", record.format)
    print("   • owner_address  :", record.owner_address)

    # 5️⃣ Fetch latest Merkle snapshot
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
            "reason": "No anchored Merkle root"
        }

    print("✅ Merkle snapshot FOUND")
    print("   • root        :", snapshot.root.hex())
    print("   • tx_hash     :", snapshot.tx_hash)
    print("   • block       :", snapshot.block_number)
    print("   • anchored_at :", snapshot.anchored_at.isoformat())

    print("🎯 VERIFICATION SUCCESS")
    print("========================================================\n")

    return {
        "verified": True,
        "record_hash": record_hash,
        "anchored_root": Web3.to_hex(snapshot.root),
        "anchored_at": snapshot.anchored_at.isoformat(),
    }




@router.get("/affidavit/{record_hash}")
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


@router.get("/affidavit/{record_hash}/pdf")
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


@router.post("/affidavit/verify-signature")
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




@router.post("affidavit/verify/full")
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
