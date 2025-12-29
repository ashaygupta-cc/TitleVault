from web3 import Web3

def keccak(data: bytes) -> bytes:
    return Web3.keccak(data)

def build_merkle_tree(leaves: list[bytes]) -> list[list[bytes]]:
    if not leaves:
        raise ValueError("No leaves")

    tree = [leaves]

    while len(tree[-1]) > 1:
        level = tree[-1]
        next_level = []

        for i in range(0, len(level), 2):
            left = level[i]
            right = level[i + 1] if i + 1 < len(level) else left
            next_level.append(keccak(left + right))

        tree.append(next_level)

    return tree


def get_merkle_root(tree: list[list[bytes]]) -> bytes:
    return tree[-1][0]
