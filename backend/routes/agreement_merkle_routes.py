from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from web3 import Web3

from models import Agreement, get_db
from merkle.utils import agreement_leaf_hash
from merkle.tree import build_merkle_tree
from merkle.proof import generate_proof

router = APIRouter(tags=["Agreement Merkle"])


# -------------------------------------------------
# CANONICAL SUBJECT BYTES (MUST MATCH ANCHOR LOGIC)
# -------------------------------------------------
def _subject_to_bytes(subject_id: str, subject_type: str) -> bytes:
    if subject_type == "FLAT":
        # FLAT → keccak(UUID string)
        return Web3.keccak(text=subject_id)

    if subject_type == "LAND":
        # LAND → raw bytes32 (record_hash)
        if not subject_id.startswith("0x"):
            raise HTTPException(400, "Invalid LAND subject_id")
        return bytes.fromhex(subject_id[2:])

    raise HTTPException(400, "Unknown subject_type")


# =================================================
# GET /agreement/merkle/root
# =================================================
@router.get("/root")
def agreement_merkle_root(db: Session = Depends(get_db)):

    agreements = db.query(Agreement).filter(
        Agreement.status == "ACTIVE"
    ).all()

    if not agreements:
        return {"merkle_root": None, "count": 0}

    pairs = sorted(
        (
            _subject_to_bytes(a.subject_id, a.subject_type),
            a.agreement_hash,
        )
        for a in agreements
    )

    leaves = [agreement_leaf_hash(sid, ah) for sid, ah in pairs]
    tree = build_merkle_tree(leaves)
    root = tree[-1][0]

    return {
        "merkle_root": "0x" + root.hex(),
        "count": len(leaves),
    }


# =================================================
# GET /agreement/merkle/proof/{subject_id}
# =================================================
@router.get("/proof/{subject_id}")
def agreement_merkle_proof(subject_id: str, db: Session = Depends(get_db)):

    agreements = db.query(Agreement).filter(
        Agreement.status == "ACTIVE"
    ).all()

    if not agreements:
        raise HTTPException(404, "No active agreements")

    # -------------------------------------------------
    # Find the agreement safely (NO StopIteration)
    # -------------------------------------------------
    agreement = next(
        (a for a in agreements if a.subject_id == subject_id),
        None
    )

    if not agreement:
        raise HTTPException(404, "Agreement not found for subject")

    pairs = sorted(
        (
            _subject_to_bytes(a.subject_id, a.subject_type),
            a.agreement_hash,
        )
        for a in agreements
    )

    leaves = [agreement_leaf_hash(sid, ah) for sid, ah in pairs]
    tree = build_merkle_tree(leaves)
    root = tree[-1][0]

    target_leaf = agreement_leaf_hash(
        _subject_to_bytes(agreement.subject_id, agreement.subject_type),
        agreement.agreement_hash,
    )

    # -------------------------------------------------
    # Safe index lookup
    # -------------------------------------------------
    try:
        index = leaves.index(target_leaf)
    except ValueError:
        raise HTTPException(404, "Merkle leaf not found")

    proof = generate_proof(tree, index)

    return {
        "leaf": "0x" + target_leaf.hex(),
        "index": index,
        "proof": ["0x" + p.hex() for p in proof],
        "root": "0x" + root.hex(),
    }
