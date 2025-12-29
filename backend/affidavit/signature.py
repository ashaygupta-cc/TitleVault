from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from config import settings


def sign_affidavit_hash(affidavit_hash: str) -> dict:
    """
    Registrar signs affidavit hash using EIP-191 (Ethereum standard).
    Compatible with Web3.py v6+
    """

    acct = Account.from_key(settings.REGISTRAR_PRIVATE_KEY)

    clean = affidavit_hash[2:] if affidavit_hash.startswith("0x") else affidavit_hash

    # 1️⃣ Build Solidity-compatible hash
    message_hash = Web3.solidity_keccak(
        ["bytes32"],
        [bytes.fromhex(clean)],
    )

    # 2️⃣ Wrap hash as Ethereum signed message
    eth_message = encode_defunct(primitive=message_hash)

    # 3️⃣ Sign
    signed = acct.sign_message(eth_message)

    return {
        "signer": acct.address,
        "signature": signed.signature.hex(),
    }
