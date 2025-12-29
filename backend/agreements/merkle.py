# backend/agreements/merkle.py

from merkle.utils import agreement_leaf_hash
from merkle.tree import build_merkle_tree
from merkle.proof import generate_proof


def build_agreement_merkle(agreements):
    """
    Build Merkle tree for agreements.

    agreements: list of (agreement_id_bytes, canonical_hash_bytes)

    Returns:
        tree, leaves
    """

    # Deterministic ordering is critical
    leaves = [
        agreement_leaf_hash(agreement_id, canonical_hash)
        for agreement_id, canonical_hash in sorted(agreements)
    ]

    tree = build_merkle_tree(leaves)
    return tree, leaves


def generate_agreement_proof(tree, leaves, index):
    """
    Generate Merkle inclusion proof for an agreement.
    """
    return generate_proof(tree, index)
