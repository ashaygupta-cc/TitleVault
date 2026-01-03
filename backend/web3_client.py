import json
from pathlib import Path
from web3 import Web3
from eth_account import Account
from fastapi import HTTPException
from config import settings
from utils.bytes32 import to_bytes32

BASE_DIR = Path(__file__).resolve().parent

# =====================================================
# WEB3 INIT
# =====================================================

print("🌐 WEB3 PROVIDER:", settings.ALCHEMY_HTTP)
w3 = Web3(Web3.HTTPProvider(settings.ALCHEMY_HTTP))

print("🔌 Web3 connected:", w3.is_connected())
print("🔗 Chain ID:", w3.eth.chain_id if w3.is_connected() else "N/A")

if not w3.is_connected():
    raise RuntimeError("Blockchain RPC not reachable")

# =====================================================
# REGISTRAR
# =====================================================

REGISTRAR_ACCOUNT = Account.from_key(settings.REGISTRAR_PRIVATE_KEY)
REGISTRAR_ADDRESS = Web3.to_checksum_address(REGISTRAR_ACCOUNT.address)

print("👤 REGISTRAR ADDRESS:", REGISTRAR_ADDRESS)

# =====================================================
# REGISTRY RESOLVER (PHASE 1–4)
# =====================================================

ABI_PATH = BASE_DIR / "contracts" / "abi" / "RegistryResolver.json"
ABI = json.loads(ABI_PATH.read_text())["abi"]

registry_resolver_contract = None

if settings.CONTRACT_ADDRESS:
    registry_resolver_contract = w3.eth.contract(
        address=Web3.to_checksum_address(settings.CONTRACT_ADDRESS),
        abi=ABI,
    )
    print("📜 Using RegistryResolver at:", registry_resolver_contract.address)
else:
    print("❌ CONTRACT_ADDRESS not set")

# =====================================================
# AGREEMENT LEDGER (PHASE 9)
# =====================================================

AGREEMENT_LEDGER_ABI_PATH = BASE_DIR / "contracts" / "abi" / "AgreementLedger.json"

AGREEMENT_LEDGER_ADDRESS = None
agreement_ledger_contract = None

if AGREEMENT_LEDGER_ABI_PATH.exists():
    AGREEMENT_LEDGER_ABI = json.loads(
        AGREEMENT_LEDGER_ABI_PATH.read_text()
    )["abi"]
    print("📑 AgreementLedger ABI loaded")
else:
    AGREEMENT_LEDGER_ABI = None
    print("❌ AgreementLedger ABI not found")

if settings.AGREEMENT_LEDGER_ADDRESS and AGREEMENT_LEDGER_ABI:
    AGREEMENT_LEDGER_ADDRESS = Web3.to_checksum_address(
        settings.AGREEMENT_LEDGER_ADDRESS
    )

    agreement_ledger_contract = w3.eth.contract(
        address=AGREEMENT_LEDGER_ADDRESS,
        abi=AGREEMENT_LEDGER_ABI,
    )

    print("📝 Using AgreementLedger at:", AGREEMENT_LEDGER_ADDRESS)
else:
    print("⚠️ AGREEMENT_LEDGER_ADDRESS not set or ABI missing")

# =====================================================
# AGREEMENT MERKLE ANCHOR (PHASE 9B)
# =====================================================

AGREEMENT_MERKLE_ANCHOR_ABI_PATH = (
    BASE_DIR / "contracts" / "abi" / "AgreementMerkleAnchor.json"
)

AGREEMENT_MERKLE_ANCHOR_ADDRESS = None
agreement_merkle_anchor_contract = None

if AGREEMENT_MERKLE_ANCHOR_ABI_PATH.exists():
    AGREEMENT_MERKLE_ANCHOR_ABI = json.loads(
        AGREEMENT_MERKLE_ANCHOR_ABI_PATH.read_text()
    )["abi"]
else:
    AGREEMENT_MERKLE_ANCHOR_ABI = None

if settings.AGREEMENT_MERKLE_ANCHOR_ADDRESS and AGREEMENT_MERKLE_ANCHOR_ABI:
    AGREEMENT_MERKLE_ANCHOR_ADDRESS = Web3.to_checksum_address(
        settings.AGREEMENT_MERKLE_ANCHOR_ADDRESS
    )

    agreement_merkle_anchor_contract = w3.eth.contract(
        address=AGREEMENT_MERKLE_ANCHOR_ADDRESS,
        abi=AGREEMENT_MERKLE_ANCHOR_ABI,
    )

    print("🌳 Using AgreementMerkleAnchor at:", AGREEMENT_MERKLE_ANCHOR_ADDRESS)
else:
    print("⚠️ AGREEMENT_MERKLE_ANCHOR_ADDRESS not set or ABI missing")

# =====================================================
# REGISTRY ROOT ANCHOR (PHASE 5)
# =====================================================

ROOT_ABI_PATH = BASE_DIR / "contracts" / "abi" / "RegistryRootAnchor.json"
ROOT_ABI = json.loads(ROOT_ABI_PATH.read_text())["abi"]

registry_root_contract = None

if settings.REGISTRY_ROOT_CONTRACT:
    registry_root_contract = w3.eth.contract(
        address=Web3.to_checksum_address(settings.REGISTRY_ROOT_CONTRACT),
        abi=ROOT_ABI,
    )
    print("🌳 Using RegistryRootAnchor at:", registry_root_contract.address)
else:
    print("❌ REGISTRY_ROOT_CONTRACT not set")


# =====================================================
# GAS HELPERS (PRINT SAFE)
# =====================================================

def _gas_params(priority_gwei=2):
    block = w3.eth.get_block("latest")
    base_fee = block["baseFeePerGas"]
    priority = w3.to_wei(priority_gwei, "gwei")

    print("⛽ Base fee:", base_fee)
    print("⚡ Priority fee:", priority)
    print("💰 Max fee:", base_fee * 2 + priority)

    return {
        "maxFeePerGas": base_fee * 2 + priority,
        "maxPriorityFeePerGas": priority,
    }

# =====================================================
# CREATE RECORD
# =====================================================
def send_create_record_tx(
    record_hash_hex: str,
    cid: str,
    owner_addr: str,
    registrar_sig: bytes = b"",
):
    print("\n================ CREATE RECORD TX =================")

    if not w3.is_connected():
        raise HTTPException(status_code=503, detail="Blockchain RPC not reachable")

    if registry_resolver_contract is None:
        raise HTTPException(status_code=500, detail="registry_resolver_contract not initialized")

    # ✅ CHECKSUM OWNER ADDRESS
    try:
        owner_addr = Web3.to_checksum_address(owner_addr)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid owner Ethereum address")

    print("🧾 Record hash (hex):", record_hash_hex)
    print("📦 CID:", cid)
    print("👤 Owner:", owner_addr)

    record_hash_bytes = to_bytes32(record_hash_hex)

    nonce = w3.eth.get_transaction_count(
    REGISTRAR_ADDRESS,
    block_identifier="pending"
    )

    print("🔑 Signing account:", REGISTRAR_ADDRESS)
    print("🔢 Nonce:", nonce)

    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas")
    priority_fee = w3.to_wei(2, "gwei")

    max_fee = base_fee * 2 + priority_fee

    print("⛽ Base fee:", base_fee)
    print("⚡ Priority fee:", priority_fee)
    print("💰 Max fee per gas:", max_fee)

    tx = registry_resolver_contract.functions.createRecord(
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
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)

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

    if registry_resolver_contract is None:
        raise HTTPException(status_code=500, detail="RegistryResolver contract not initialized")

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


    nonce = w3.eth.get_transaction_count(
    REGISTRAR_ADDRESS,
    block_identifier="pending"
    )

    print("🔑 Signing account:", REGISTRAR_ADDRESS)
    print("🔢 Nonce:", nonce)

    latest_block = w3.eth.get_block("latest")
    base_fee = latest_block.get("baseFeePerGas")
    priority_fee = w3.to_wei(2, "gwei")

    max_fee = base_fee * 2 + priority_fee

    print("⛽ Base fee:", base_fee)
    print("⚡ Priority fee:", priority_fee)
    print("💰 Max fee:", max_fee)

    tx = registry_resolver_contract.functions.transferRecord(
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
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)

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

    if registry_resolver_contract  is None:
        raise HTTPException(status_code=500, detail="RegistryResolver contract not initialized")

    print("🔍 Querying hash:", record_hash_hex)
    print("📜 Contract:", registry_resolver_contract.address)

    record_hash_bytes = to_bytes32(record_hash_hex)

    result = registry_resolver_contract.functions.getRecord(record_hash_bytes).call()

    print("📦 On-chain record:", result)
    print("==============================================\n")

    return result

# -------------------------------------------------
# ACCESSORS
# -------------------------------------------------

def get_registry_resolver_contract():
    """
    Returns the RegistryResolver contract.
    Keeps backward compatibility with existing code.
    """
    if registry_resolver_contract  is None:
        raise RuntimeError("RegistryResolver contract not initialized")
    return registry_resolver_contract 


def get_registry_root_contract():
    """
    Returns the RegistryRootAnchor contract.
    REQUIRED for Merkle anchoring.
    """
    if registry_root_contract is None:
        raise RuntimeError("RegistryRootAnchor contract not initialized")
    return registry_root_contract



def send_subdivide_record_tx(
    parent_hash_hex,
    child_hash_hex,
    cid,
    owner_addr,
    registrar_sig=b"",
):
    print("\n================ SUBDIVIDE TX =================")

    parent_bytes = to_bytes32(parent_hash_hex)
    child_bytes = to_bytes32(child_hash_hex)

    nonce = w3.eth.get_transaction_count(
    REGISTRAR_ADDRESS,
    block_identifier="pending"
    )

    block = w3.eth.get_block("latest")
    base_fee = block["baseFeePerGas"]
    priority = w3.to_wei(3, "gwei")
    
    resolver = get_registry_resolver_contract()

    tx = resolver.functions.subdivideRecord(
        parent_bytes,
        child_bytes,
        cid,
        Web3.to_checksum_address(owner_addr),
        registrar_sig,
    ).build_transaction({
        "from": REGISTRAR_ADDRESS,
        "nonce": nonce,
        "gas": 700000,
        "maxFeePerGas": base_fee * 2 + priority,
        "maxPriorityFeePerGas": priority,
        "chainId": w3.eth.chain_id,
    })

    signed = REGISTRAR_ACCOUNT.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)

    print("🚀 Subdivision TX:", w3.to_hex(tx_hash))
    return w3.to_hex(tx_hash)




# =====================================================
# AGREEMENT LEDGER TXs
# =====================================================

def get_agreement_ledger_contract():
    if agreement_ledger_contract is None:
        raise RuntimeError("AgreementLedger contract not initialized")
    return agreement_ledger_contract

def send_activate_land_agreement_tx(
    record_hash_hex: str,
    agreement_hash_hex: str
):
    """
    record_hash_hex: 0x-prefixed land record hash
    agreement_hash_hex: 0x-prefixed agreement hash
    """

    print("\n================ ACTIVATE LAND AGREEMENT =================")

    ledger = get_agreement_ledger_contract()
    nonce = w3.eth.get_transaction_count(
    REGISTRAR_ADDRESS,
    block_identifier="pending"
    )

    # ✅ Land uses RAW record_hash bytes32
    record_bytes = bytes.fromhex(record_hash_hex[2:])
    agreement_bytes = bytes.fromhex(agreement_hash_hex[2:])

    tx = ledger.functions.activateLandAgreement(
        record_bytes,
        agreement_bytes,
    ).build_transaction({
        "from": REGISTRAR_ADDRESS,
        "nonce": nonce,
        "gas": 300_000,
        "chainId": w3.eth.chain_id,
        **_gas_params(),
    })

    signed = REGISTRAR_ACCOUNT.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)

    print("🚀 Land agreement activation TX:", w3.to_hex(tx_hash))
    print("=========================================================\n")

    return w3.to_hex(tx_hash)


# ======================================================
# FLAT AGREEMENT ACTIVATION (🔥 THIS WAS BROKEN)
# ======================================================

def send_activate_flat_agreement_tx(
    flat_id: str,
    agreement_hash_hex: str
):
    """
    flat_id MUST be the original flat UUID.
    Always hashed as keccak(str(flat_id))
    """

    print("\n================ ACTIVATE FLAT AGREEMENT =================")

    ledger = get_agreement_ledger_contract()
    print("🔗 AGREEMENT LEDGER ADDRESS (activate):", ledger.address)

    nonce = w3.eth.get_transaction_count(
    REGISTRAR_ADDRESS,
    block_identifier="pending"
    )

    # ✅ HARD CANONICALIZATION (THIS IS THE FIX)
    flat_id_str = str(flat_id).strip()
    flat_subject_bytes = Web3.keccak(text=flat_id_str)

    # Debug (KEEP FOR ONE RUN)
    print("🔑 FLAT SUBJECT STRING:", repr(flat_id_str))
    print("🔑 FLAT SUBJECT HASH :", Web3.to_hex(flat_subject_bytes))

    agreement_bytes = bytes.fromhex(agreement_hash_hex[2:])

    tx = ledger.functions.activateFlatAgreement(
        flat_subject_bytes,
        agreement_bytes,
    ).build_transaction({
        "from": REGISTRAR_ADDRESS,
        "nonce": nonce,
        "gas": 300_000,
        "chainId": w3.eth.chain_id,
        **_gas_params(),
    })

    signed = REGISTRAR_ACCOUNT.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)

    print("🚀 Flat agreement activation TX:", w3.to_hex(tx_hash))
    print("=========================================================\n")

    return w3.to_hex(tx_hash)



def send_close_agreement_tx(subject_id: str, is_flat: bool, action: str):
    ledger = get_agreement_ledger_contract()
    print("🔗 AGREEMENT LEDGER ADDRESS (close):", ledger.address)

    nonce = w3.eth.get_transaction_count(
    REGISTRAR_ADDRESS,
    block_identifier="pending"
    )

    # ✅ HARD CANONICALIZATION
    if is_flat:
        subject_id_str = str(subject_id).strip()
        subject_key = Web3.keccak(text=subject_id_str)

        # Debug (KEEP FOR ONE RUN)
        print("🔑 FLAT SUBJECT STRING:", repr(subject_id_str))
        print("🔑 FLAT SUBJECT HASH :", Web3.to_hex(subject_key))
    else:
        subject_key = bytes.fromhex(subject_id[2:])

    # --------------------------------------------------
    # Choose action
    # --------------------------------------------------
    if action == "complete":
        fn = ledger.functions.completeAgreement
    elif action == "cancel":
        fn = ledger.functions.cancelAgreement
    elif action == "default":
        fn = ledger.functions.defaultAgreement
    else:
        raise ValueError("Invalid agreement close action")

    tx = fn(
        subject_key,
        is_flat
    ).build_transaction({
        "from": REGISTRAR_ADDRESS,
        "nonce": nonce,
        "gas": 300_000,
        "chainId": w3.eth.chain_id,
        **_gas_params(),
    })

    signed = REGISTRAR_ACCOUNT.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)

    print(f"🚀 Agreement {action.upper()} TX:", w3.to_hex(tx_hash))
    return w3.to_hex(tx_hash)



def is_subject_locked_on_chain(subject_id: str, is_flat: bool) -> bool:
    ledger = get_agreement_ledger_contract()

    if is_flat:
        # ✅ HARD CANONICALIZATION (MATCHES ACTIVATION LOGIC)
        subject_id_str = str(subject_id).strip()
        subject_bytes = Web3.keccak(text=subject_id_str)
    else:
        # ✅ LAND = strict 0x-prefixed bytes32
        if not subject_id.startswith("0x") or len(subject_id) != 66:
            raise ValueError("Invalid land record hash format")
        subject_bytes = bytes.fromhex(subject_id[2:])

    anchor = ledger.functions.getAgreement(
        subject_bytes,
        is_flat
    ).call()

    # status == ACTIVE (enum value 1)
    return anchor[1] == 1




def extract_agreement_events(tx_hash_hex):
    ledger = get_agreement_ledger_contract()
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash_hex, timeout=120)

    activated = ledger.events.AgreementActivated().process_receipt(receipt)
    closed = ledger.events.AgreementClosed().process_receipt(receipt)

    print("📡 AgreementActivated events:", activated)
    print("📡 AgreementClosed events:", closed)

    return {
        "activated": activated,
        "closed": closed,
    }


# =====================================================
# AGREEMENT MERKLE ANCHOR TXs
# =====================================================
def get_agreement_merkle_anchor_contract():
    return w3.eth.contract(
        address=AGREEMENT_MERKLE_ANCHOR_ADDRESS,
        abi=AGREEMENT_MERKLE_ANCHOR_ABI,
    )
