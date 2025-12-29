from web3 import Web3


def keccak(data: bytes) -> bytes:
    return Web3.keccak(data)


def build_merkle_tree(leaves: list[bytes]) -> list[list[bytes]]:
    """
    Builds a Merkle tree as a list of levels.
    tree[0] = leaves
    tree[-1][0] = root
    """

    if not leaves:
        raise ValueError("No leaves provided")

    # Defensive copy
    current_level = list(leaves)
    tree = [current_level]

    while len(current_level) > 1:
        next_level = []

        for i in range(0, len(current_level), 2):
            left = current_level[i]
            right = (
                current_level[i + 1]
                if i + 1 < len(current_level)
                else left
            )
            next_level.append(keccak(left + right))

        current_level = next_level
        tree.append(current_level)

    return tree


def get_merkle_root(tree: list[list[bytes]]) -> bytes:
    if not tree or not tree[-1]:
        raise ValueError("Invalid Merkle tree")
    return tree[-1][0]
