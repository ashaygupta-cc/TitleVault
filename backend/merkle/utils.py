from web3 import Web3
from merkle.tree import build_merkle_tree, get_merkle_root
from merkle.proof import generate_proof

ZERO32 = b"\x00" * 32


def merkle_leaf_hash(record_hash: bytes, canonical_hash: bytes, parent_record: bytes | None):
    return Web3.keccak(
        b"REGISTRY_LEAF_V1" +
        record_hash +
        canonical_hash +
        (parent_record or ZERO32)
    )

# merkle/utils.py
def agreement_leaf_hash(subject_id: bytes, agreement_hash: bytes) -> bytes:
    return Web3.solidity_keccak(
        ["bytes32", "bytes32"],
        [subject_id, agreement_hash],
    )
