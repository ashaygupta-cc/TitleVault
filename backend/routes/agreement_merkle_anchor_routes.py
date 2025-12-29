from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from web3 import Web3
from eth_account import Account
from web3.exceptions import TimeExhausted

from models import Agreement, get_db
from merkle.utils import agreement_leaf_hash
from merkle.tree import build_merkle_tree
from web3_client import w3, get_agreement_merkle_anchor_contract
from config import settings

router = APIRouter(tags=["Agreement Merkle Anchor"])

# -------------------------------------------------
# CANONICAL SUBJECT BYTES (CRITICAL)
# -------------------------------------------------
def _subject_to_bytes(subject_id: str, subject_type: str) -> bytes:
    if subject_type == "FLAT":
        return Web3.keccak(text=subject_id)
    elif subject_type == "LAND":
        if not subject_id.startswith("0x"):
            raise ValueError("Invalid LAND subject_id")
        return bytes.fromhex(subject_id[2:])
    else:
        raise ValueError("Unknown subject_type")

# -------------------------------------------------
# POST /agreement/merkle/anchor
# -------------------------------------------------
@router.post("/anchor")
def anchor_agreement_merkle(db: Session = Depends(get_db)):

    agreements = db.query(Agreement).filter(
        Agreement.status == "ACTIVE"
    ).all()

    if not agreements:
        raise HTTPException(400, "No active agreements")

    # -------------------------------------------------
    # Build Merkle leaves (deterministic ordering)
    # -------------------------------------------------
    pairs = sorted(
        (
            _subject_to_bytes(a.subject_id, a.subject_type),
            a.agreement_hash,
        )
        for a in agreements
    )

    leaves = [agreement_leaf_hash(sid, ah) for sid, ah in pairs]

    if not leaves:
        raise HTTPException(
            status_code=400,
            detail="No Merkle leaves generated from ACTIVE agreements"
        )

    tree = build_merkle_tree(leaves)
    root = tree[-1][0]

    contract = get_agreement_merkle_anchor_contract()

    # -------------------------------------------------
    # Prevent duplicate anchoring
    # -------------------------------------------------
    try:
        latest = contract.functions.latest().call()
        if latest[0] == root:
            return {
                "merkle_root": "0x" + root.hex(),
                "count": len(leaves),
                "status": "ALREADY_ANCHORED",
            }
    except Exception:
        pass

    # -------------------------------------------------
    # Manual signing
    # -------------------------------------------------
    acct = Account.from_key(settings.REGISTRAR_PRIVATE_KEY)

    if acct.address.lower() != settings.REGISTRAR_ADDRESS.lower():
        raise HTTPException(
            500,
            "Registrar private key does not match registrar address"
        )

    nonce = w3.eth.get_transaction_count(acct.address, "pending")

    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block["baseFeePerGas"]

    priority_fee = w3.to_wei(2, "gwei")
    max_fee = base_fee + priority_fee

    tx = contract.functions.anchor(
        root,
        len(leaves),
    ).build_transaction({
        "from": acct.address,
        "nonce": nonce,
        "chainId": w3.eth.chain_id,
        "gas": 200_000,
        "maxPriorityFeePerGas": priority_fee,
        "maxFeePerGas": max_fee,
    })

    signed = acct.sign_transaction(tx)

    # -------------------------------------------------
    # SEND TX (NON-BLOCKING)
    # -------------------------------------------------
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

    # -------------------------------------------------
    # TRY to wait briefly (optional)
    # -------------------------------------------------
    try:
        receipt = w3.eth.wait_for_transaction_receipt(
            tx_hash,
            timeout=30,
            poll_latency=2
        )

        if receipt.status != 1:
            raise HTTPException(500, "Merkle anchoring failed on-chain")

        return {
            "merkle_root": "0x" + root.hex(),
            "count": len(leaves),
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
            "status": "CONFIRMED",
        }

    except TimeExhausted:
        # ⏳ Still pending — THIS IS NORMAL
        return {
            "merkle_root": "0x" + root.hex(),
            "count": len(leaves),
            "tx_hash": tx_hash.hex(),
            "status": "PENDING_ON_CHAIN",
        }
