from config import settings
from web3_client import (
    w3,
    REGISTRAR_ADDRESS,
    get_registry_root_contract,
)


def anchor_merkle_root(root_hex: str) -> str:
    if not root_hex.startswith("0x"):
        raise ValueError("Root must be hex string")

    registry_root_contract = get_registry_root_contract() 

    root_bytes = bytes.fromhex(root_hex[2:])

    nonce = w3.eth.get_transaction_count(REGISTRAR_ADDRESS)

    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas")
    priority_fee = w3.to_wei(2, "gwei")

    tx = registry_root_contract.functions.anchorRoot(
        root_bytes
    ).build_transaction({
        "from": REGISTRAR_ADDRESS,
        "nonce": nonce,
        "gas": 150_000,
        "maxFeePerGas": base_fee * 2 + priority_fee,
        "maxPriorityFeePerGas": priority_fee,
        "chainId": w3.eth.chain_id,
    })

    signed = w3.eth.account.sign_transaction(
        tx,
        private_key=settings.REGISTRAR_PRIVATE_KEY
    )

    tx_hash = w3.eth.send_raw_transaction(
        signed.raw_transaction
    )

    return w3.to_hex(tx_hash)
