from merkle.utils import agreement_leaf_hash
from merkle.tree import build_merkle_tree

def build_flat_agreement_merkle(agreements):
    """
    agreements: list of (flat_id_bytes, agreement_hash_bytes)
    """

    # Deterministic ordering
    leaves = [
        agreement_leaf_hash(flat_id, agreement_hash)
        for flat_id, agreement_hash in sorted(agreements)
    ]

    tree = build_merkle_tree(leaves)

    return {
        "root": tree.root,
        "leaves": leaves,
        "count": len(leaves),
        "tree": tree,
    }
