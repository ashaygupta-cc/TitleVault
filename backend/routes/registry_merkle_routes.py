from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from web3 import Web3

from sqlalchemy import desc
from datetime import datetime, timezone

from models import PropertyRecord, get_db, MerkleSnapshot
from merkle.proof import verify_proof, verify_proof_with_trace
from merkle.utils import (
    build_merkle_tree,
    get_merkle_root,
    generate_proof,
    merkle_leaf_hash
)
from schemas.registry_merkle_schema import (
    MerkleRootResponse,
    MerkleProofResponse,
    MerkleVerifyRequest,
    MerkleVerifyResponse,
    MerkleVerifyPublicResponse,
    MerkleVerifyPublicRequest
)

from web3_client import w3
from chain.merkle_anchor import anchor_merkle_root


router = APIRouter(tags=["Registry Merkle"])


@router.get("/root", response_model=MerkleRootResponse)
def get_root(db: Session = Depends(get_db)):

    print("\n================ MERKLE ROOT =================")

    records = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.format == "CANONICAL")
        .order_by(PropertyRecord.record_hash)
        .all()
    )

    print("📦 Canonical records count:", len(records))

    if not records:
        print("❌ No canonical records found")
        print("================================================\n")
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

    print("🌳 Merkle root:", Web3.to_hex(root))
    print("================================================\n")

    return {
        "merkle_root": Web3.to_hex(root),
        "count": len(leaves),
    }


@router.get("/proof/{record_hash}", response_model=MerkleProofResponse)
def get_proof(record_hash: str, db: Session = Depends(get_db)):

    print("\n================ MERKLE PROOF =================")
    print("📥 record_hash (raw):", record_hash)

    clean = record_hash[2:] if record_hash.startswith("0x") else record_hash
    print("🧹 record_hash (clean):", clean)

    try:
        target = bytes.fromhex(clean)
    except ValueError:
        print("❌ Invalid hex record_hash")
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
        print("❌ Record not found in canonical set")
        raise HTTPException(404, "Record not found in canonical set")

    print("📍 Found index:", index)

    tree = build_merkle_tree(leaves)
    proof = generate_proof(tree, index)
    root = get_merkle_root(tree)

    print("🧩 LEAF (proof endpoint):", leaf.hex())
    print("🌳 Merkle root:", Web3.to_hex(root))
    print("🧩 Proof length:", len(proof))
    print("================================================\n")

    return {
        "record_hash": Web3.to_hex(target),
        "index": index,
        "proof": [Web3.to_hex(p) for p in proof],
        "root": Web3.to_hex(root),
    }


@router.post("/anchor")
def anchor_current_root(db: Session = Depends(get_db)):

    print("\n================ MERKLE ANCHOR =================")

    records = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.format == "CANONICAL")
        .order_by(PropertyRecord.record_hash)
        .all()
    )

    print("📦 Records to anchor:", len(records))

    if not records:
        print("❌ No canonical records to anchor")
        raise HTTPException(400, "No canonical records to anchor")

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

    print("🌳 Root to anchor:", root_hex)

    tx_hash = anchor_merkle_root(root_hex)
    print("⛓️ Anchor TX sent:", tx_hash)

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    print("🧱 Block number:", receipt.blockNumber)

    snapshot = MerkleSnapshot(
        root=root_bytes,
        tx_hash=tx_hash,
        block_number=receipt.blockNumber,
    )

    db.add(snapshot)
    db.commit()

    print("✅ Merkle root anchored and snapshot saved")
    print("================================================\n")

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

    print("\n================ MERKLE VERIFY DEBUG ================")

    clean = req.record_hash[2:] if req.record_hash.startswith("0x") else req.record_hash
    record_hash_bytes = bytes.fromhex(clean)

    record = (
        db.query(PropertyRecord)
        .filter(PropertyRecord.record_hash == record_hash_bytes)
        .first()
    )

    if not record:
        print("❌ Record not found")
        raise HTTPException(404, "Record not found")

    leaf = merkle_leaf_hash(
        record.record_hash,
        record.canonical_hash,
        record.parent_record
    )

    print("📌 record_hash      :", record.record_hash.hex())
    print("📌 canonical_hash   :", record.canonical_hash.hex())
    print("📌 parent_record    :", record.parent_record.hex() if record.parent_record else "ZERO32")
    print("🧩 LEAF (computed)  :", leaf.hex())
    print("📍 index            :", req.index)
    print("📍 expected_root    :", req.root)

    print("📍 proof elements:")
    for i, p in enumerate(req.proof):
        print(f"   [{i}]", p)

    is_valid, computed_root = verify_proof(
        leaf=leaf,
        proof=[bytes.fromhex(p[2:]) for p in req.proof],
        index=req.index,
        expected_root=bytes.fromhex(req.root[2:])
    )

    print("🧮 computed_root    :", computed_root.hex())
    print("🎯 VALID            :", is_valid)
    print("====================================================\n")

    return {
        "valid": is_valid,
        "computed_root": Web3.to_hex(computed_root),
        "expected_root": req.root
    }


@router.post("/verify", response_model=MerkleVerifyPublicResponse)
def verify_merkle_public(req: MerkleVerifyPublicRequest):

    print("\n================ MERKLE VERIFY (PUBLIC) =================")
    print("🧩 Leaf:", req.leaf)
    print("📍 Index:", req.index)
    print("🌳 Root:", req.root)

    leaf = bytes.fromhex(req.leaf[2:])
    proof = [bytes.fromhex(p[2:]) for p in req.proof]
    root = bytes.fromhex(req.root[2:])

    is_valid, computed = verify_proof(
        leaf=leaf,
        proof=proof,
        index=req.index,
        expected_root=root
    )

    print("🎯 VALID:", is_valid)
    print("========================================================\n")

    return {
        "valid": is_valid,
        "computed_root": Web3.to_hex(computed)
    }


@router.post("/verify-fraud")
def verify_merkle_fraud(req: MerkleVerifyPublicRequest):

    print("\n================ MERKLE VERIFY (FRAUD TRACE) =================")

    result = verify_proof_with_trace(
        leaf=bytes.fromhex(req.leaf[2:]),
        proof=[bytes.fromhex(p[2:]) for p in req.proof],
        index=req.index,
        expected_root=bytes.fromhex(req.root[2:])
    )

    print("🚨 FRAUD TRACE RESULT:", result)
    print("==============================================================\n")

    return result


@router.get("/snapshots")
def list_merkle_snapshots(
    limit: int = Query(5, le=50),
    cursor: str | None = None,
    db: Session = Depends(get_db),
):

    print("\n================ MERKLE SNAPSHOTS =================")
    print("📥 limit:", limit)
    print("📥 cursor:", cursor)

    query = db.query(MerkleSnapshot).order_by(
        MerkleSnapshot.anchored_at.desc()
    )

    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
        except ValueError:
            print("❌ Invalid cursor format")
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

    print("📦 Snapshots returned:", len(snapshots))
    print("➡️ next_cursor:", next_cursor)
    print("==================================================\n")

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
