from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import PropertyRecord, get_db
from merkle.tree import build_merkle_tree, get_merkle_root
from merkle.proof import generate_proof
from web3 import Web3

router = APIRouter(
    tags=["Subdivision Merkle"]
)


@router.get("/merkle/{parent_hash}")
def subdivision_merkle(parent_hash: str, db: Session = Depends(get_db)):

    parent_bytes = bytes.fromhex(parent_hash[2:])

    children = db.query(PropertyRecord).filter(
        PropertyRecord.parent_record == parent_bytes
    ).all()

    if not children:
        return {
            "parent_record": parent_hash,
            "children_count": 0,
            "merkle_root": None,
            "children": [],
        }

    leaves = [c.record_hash for c in children]

    tree = build_merkle_tree(leaves)
    root = get_merkle_root(tree)

    return {
        "parent_record": parent_hash,
        "children_count": len(leaves),
        "merkle_root": Web3.to_hex(root),
        "children": [
            {
                "record_hash": Web3.to_hex(c.record_hash),
                "index": i,
                "proof": [Web3.to_hex(p) for p in generate_proof(tree, i)],
            }
            for i, c in enumerate(children)
        ],
    }
