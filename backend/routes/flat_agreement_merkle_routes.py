from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from web3 import Web3

from models import Agreement, get_db
from merkle.utils import agreement_leaf_hash
from merkle.tree import build_merkle_tree
from merkle.proof import generate_proof

router = APIRouter(
    tags=["Flat Agreement Merkle"]
)


def _flat_id_to_bytes(flat_id: str) -> bytes:
    """
    Deterministically hash flat UUID/string to bytes32.
    This MUST stay stable forever.
    """
    return Web3.keccak(text=flat_id)


# ======================================================
# MERKLE ROOT — ALL ACTIVE FLAT AGREEMENTS
# ======================================================

@router.get("/root")
def flat_agreement_merkle_root(db: Session = Depends(get_db)):

    agreements = db.query(Agreement).filter(
        Agreement.subject_type == "FLAT",
        Agreement.status == "ACTIVE",
    ).all()

    if not agreements:
        return {
            "merkle_root": None,
            "count": 0,
        }

    # (flat_id_bytes, agreement_hash) — deterministic ordering
    pairs = sorted(
        (
            _flat_id_to_bytes(a.subject_id),
            a.agreement_hash,
        )
        for a in agreements
    )

    leaves = [
        agreement_leaf_hash(flat_id_bytes, agreement_hash)
        for flat_id_bytes, agreement_hash in pairs
    ]

    tree = build_merkle_tree(leaves)
    root = tree[-1][0]

    return {
        "merkle_root": "0x" + root.hex(),
        "count": len(leaves),
    }


# ======================================================
# MERKLE PROOF — SINGLE FLAT
# ======================================================

@router.get("/proof/{flat_id}")
def flat_agreement_merkle_proof(flat_id: str, db: Session = Depends(get_db)):

    agreements = db.query(Agreement).filter(
        Agreement.subject_type == "FLAT",
        Agreement.status == "ACTIVE",
    ).all()

    if not agreements:
        raise HTTPException(404, "No active flat agreements")

    pairs = sorted(
        (
            _flat_id_to_bytes(a.subject_id),
            a.agreement_hash,
        )
        for a in agreements
    )

    leaves = [
        agreement_leaf_hash(fid_bytes, ah)
        for fid_bytes, ah in pairs
    ]

    tree = build_merkle_tree(leaves)
    root = tree[-1][0]
    
    target = next(
        (a for a in agreements if a.subject_id == flat_id),
        None
    )

    if not target:
        raise HTTPException(404, "Flat not in active Merkle set")

    target_leaf = agreement_leaf_hash(
        _flat_id_to_bytes(flat_id),
        target.agreement_hash,
    )

    try:
        index = leaves.index(target_leaf)
    except ValueError:
        raise HTTPException(500, "Merkle leaf mismatch")

    proof = generate_proof(tree, index)

    return {
        "leaf": "0x" + target_leaf.hex(),
        "index": index,
        "proof": ["0x" + p.hex() for p in proof],
        "root": "0x" + root.hex(),
    }
