from web3 import Web3

def generate_proof(tree, index):
    proof = []
    for level in tree[:-1]:
        sibling_index = index ^ 1
        if sibling_index < len(level):
            proof.append(level[sibling_index])
        index //= 2
    return proof

def verify_proof(
    leaf: bytes,
    proof: list[bytes],
    index: int,
    expected_root: bytes,
):
    computed = leaf
    idx = index

    for sibling in proof:
        if idx % 2 == 0:
            computed = Web3.keccak(computed + sibling)
        else:
            computed = Web3.keccak(sibling + computed)
        idx //= 2

    return computed == expected_root, computed

def verify_proof_with_trace(
    leaf: bytes,
    proof: list[bytes],
    index: int,
    expected_root: bytes,
):
    computed = leaf
    idx = index
    trace = []

    for i, sibling in enumerate(proof):
        if idx % 2 == 0:
            left = computed
            right = sibling
        else:
            left = sibling
            right = computed

        next_hash = Web3.keccak(left + right)

        trace.append({
            "step": i,
            "index": idx,
            "left": Web3.to_hex(left),
            "right": Web3.to_hex(right),
            "computed": Web3.to_hex(next_hash),
        })

        computed = next_hash
        idx //= 2

    return {
        "valid": computed == expected_root,
        "computed_root": Web3.to_hex(computed),
        "expected_root": Web3.to_hex(expected_root),
        "trace": trace,
    }
