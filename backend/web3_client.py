import json
from pathlib import Path
from web3 import Web3
from eth_account import Account
from fastapi import HTTPException
from config import settings
from utils.bytes32 import to_bytes32


BASE_DIR = Path(__file__).resolve().parent

# RegistryResolver contract (EXISTING)

ABI_PATH = BASE_DIR / "contracts" / "abi" / "RegistryResolver.json"
ABI = json.loads(ABI_PATH.read_text())["abi"]

print("🌐 WEB3 PROVIDER:", settings.ALCHEMY_HTTP)
w3 = Web3(Web3.HTTPProvider(settings.ALCHEMY_HTTP))

print("🔌 Web3 connected:", w3.is_connected())
print("🔗 Chain ID:", w3.eth.chain_id if w3.is_connected() else "N/A")

contract = None
if settings.CONTRACT_ADDRESS:
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(settings.CONTRACT_ADDRESS),
        abi=ABI
    )
    print("📜 Using CONTRACT ADDRESS:", contract.address)
else:
    print("❌ CONTRACT_ADDRESS not set")




# RegistryRootAnchor contract (NEW – minimal add)

ROOT_ABI_PATH = BASE_DIR / "contracts" / "abi" / "RegistryRootAnchor.json"
ROOT_ABI = json.loads(ROOT_ABI_PATH.read_text())["abi"]

registry_root_contract = None
if settings.REGISTRY_ROOT_CONTRACT:
    registry_root_contract = w3.eth.contract(
        address=Web3.to_checksum_address(settings.REGISTRY_ROOT_CONTRACT),
        abi=ROOT_ABI
    )
    print("🌳 Using RegistryRootAnchor at:", registry_root_contract.address)
else:
    print("❌ REGISTRY_ROOT_CONTRACT not set")




REGISTRAR_ACCOUNT = Account.from_key(settings.REGISTRAR_PRIVATE_KEY)
REGISTRAR_ADDRESS = Web3.to_checksum_address(REGISTRAR_ACCOUNT.address)

print("👤 REGISTRAR ADDRESS:", REGISTRAR_ADDRESS)

# -------------------------------------------------
# CREATE RECORD
# -------------------------------------------------
def send_create_record_tx(
    record_hash_hex: str,
    cid: str,
    owner_addr: str,
    registrar_sig: bytes = b"",
):
    print("\n================ CREATE RECORD TX =================")

    if not w3.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain RPC not reachable")

    if contract is None:
        raise HTTPException(status_code=500, detail="Contract not initialized")

    # ✅ CHECKSUM OWNER ADDRESS
    try:
        owner_addr = Web3.to_checksum_address(owner_addr)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid owner Ethereum address")

    print("🧾 Record hash (hex):", record_hash_hex)
    print("📦 CID:", cid)
    print("👤 Owner:", owner_addr)

    record_hash_bytes = to_bytes32(record_hash_hex)

    nonce = w3.eth.get_transaction_count(REGISTRAR_ADDRESS)

    print("🔑 Signing account:", REGISTRAR_ADDRESS)
    print("🔢 Nonce:", nonce)

    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas")
    priority_fee = w3.to_wei(2, "gwei")

    max_fee = base_fee * 2 + priority_fee

    print("⛽ Base fee:", base_fee)
    print("⚡ Priority fee:", priority_fee)
    print("💰 Max fee per gas:", max_fee)

    tx = contract.functions.createRecord(
        record_hash_bytes,
        cid,
        owner_addr,
        registrar_sig
    ).build_transaction({
        "from": REGISTRAR_ADDRESS,
        "nonce": nonce,
        "gas": 600000,
        "maxFeePerGas": max_fee,
        "maxPriorityFeePerGas": priority_fee,
        "chainId": w3.eth.chain_id,
    })

    signed = REGISTRAR_ACCOUNT.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

    print("🚀 TX sent:", w3.to_hex(tx_hash))
    print("===================================================\n")

    return w3.to_hex(tx_hash)

# -------------------------------------------------
# TRANSFER RECORD
# -------------------------------------------------
def send_transfer_record_tx(
    old_record_hash_hex: str,
    new_record_hash_hex: str,
    cid: str,
    new_owner: str,
    registrar_sig: bytes = b"",
):
    print("\n================ TRANSFER RECORD TX ================")

    if not w3.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain RPC not reachable")

    if contract is None:
        raise HTTPException(status_code=500, detail="Contract not initialized")

    # ✅ CHECKSUM NEW OWNER
    try:
        new_owner = Web3.to_checksum_address(new_owner)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid new owner Ethereum address")

    print("🔁 Old hash:", old_record_hash_hex)
    print("🆕 New hash:", new_record_hash_hex)
    print("👤 New owner:", new_owner)

    old_hash_bytes = to_bytes32(old_record_hash_hex)
    new_hash_bytes = to_bytes32(new_record_hash_hex)


    nonce = w3.eth.get_transaction_count(REGISTRAR_ADDRESS)

    print("🔑 Signing account:", REGISTRAR_ADDRESS)
    print("🔢 Nonce:", nonce)

    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas")
    priority_fee = w3.to_wei(2, "gwei")

    max_fee = base_fee * 2 + priority_fee

    print("⛽ Base fee:", base_fee)
    print("⚡ Priority fee:", priority_fee)
    print("💰 Max fee:", max_fee)

    tx = contract.functions.transferRecord(
        old_hash_bytes,
        new_hash_bytes,
        cid,
        new_owner,
        registrar_sig,
    ).build_transaction({
        "from": REGISTRAR_ADDRESS,
        "nonce": nonce,
        "gas": 600000,
        "maxFeePerGas": max_fee,
        "maxPriorityFeePerGas": priority_fee,
        "chainId": w3.eth.chain_id,
    })

    signed = REGISTRAR_ACCOUNT.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

    print("🚀 TX sent:", w3.to_hex(tx_hash))
    print("===================================================\n")

    return w3.to_hex(tx_hash)

# -------------------------------------------------
# READ RECORD FROM CHAIN
# -------------------------------------------------
def get_record_from_chain(record_hash_hex: str):
    print("\n================ READ RECORD =================")

    if not w3.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain RPC not reachable")

    if contract is None:
        raise HTTPException(status_code=500, detail="Contract not initialized")

    print("🔍 Querying hash:", record_hash_hex)
    print("📜 Contract:", contract.address)

    record_hash_bytes = to_bytes32(record_hash_hex)

    result = contract.functions.getRecord(record_hash_bytes).call()

    print("📦 On-chain record:", result)
    print("==============================================\n")

    return result


def get_registry_resolver_contract():
    """
    Returns the RegistryResolver contract.
    Keeps backward compatibility with existing code.
    """
    if contract is None:
        raise RuntimeError("RegistryResolver contract not initialized")
    return contract


def get_registry_root_contract():
    """
    Returns the RegistryRootAnchor contract.
    REQUIRED for Merkle anchoring.
    """
    if registry_root_contract is None:
        raise RuntimeError("RegistryRootAnchor contract not initialized")
    return registry_root_contract