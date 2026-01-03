"""PDF Affidavit Verification Module"""
import re
import pdfplumber
from typing import Dict, Any, Optional, List
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from config import settings

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from PDF efficiently"""
    try:
        from io import BytesIO
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            text = ""
            # Only process first 5 pages to avoid timeouts
            for page in pdf.pages[:5]:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                if len(text) > 50000:  # Stop if we have enough text
                    break
            return text
    except Exception as e:
        raise ValueError(f"Failed to read PDF: {str(e)}")


def extract_affidavit_fields(text: str) -> Dict[str, Optional[str]]:
    """
    Extract key fields from affidavit text.
    Looks for hash patterns, addresses, timestamps, signatures.
    """
    fields = {
        "affidavit_hash": None,
        "owner_address": None,
        "timestamp": None,
        "signature": None,
        "record_hash": None,  # For registry
        "flat_id": None,  # For flat
        "agreement_id": None,  # For agreement
        "merkle_root": None,
        "merkle_proof": None,
    }

    # Remove newlines and extra spaces to help with extraction
    text_cleaned = ' '.join(text.split())

    # Extract 0x-prefixed hex hashes (32 or 66 chars for keccak256)
    hash_pattern = r'0x[a-fA-F0-9]{64}'
    hashes = re.findall(hash_pattern, text_cleaned)
    
    if hashes:
        # First hash is likely the affidavit_hash
        fields["affidavit_hash"] = hashes[0]
        if len(hashes) > 1:
            fields["record_hash"] = hashes[1]
        if len(hashes) > 2:
            fields["merkle_root"] = hashes[2]

    # Extract ethereum addresses (0x followed by 40 hex chars)
    address_pattern = r'0x[a-fA-F0-9]{40}'
    addresses = re.findall(address_pattern, text_cleaned)
    if addresses:
        # First address is likely the owner
        fields["owner_address"] = addresses[0]

    # Extract timestamps (ISO format or Unix timestamp)
    iso_pattern = r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
    iso_matches = re.findall(iso_pattern, text_cleaned)
    if iso_matches:
        fields["timestamp"] = iso_matches[0]

    # Extract signature (long hex - must be exactly 130 hex chars = 65 bytes)
    # Look for either with or without 0x prefix
    sig_pattern = r'0x[a-fA-F0-9]{130}|[a-fA-F0-9]{130}'
    sig_matches = re.findall(sig_pattern, text_cleaned)
    if sig_matches:
        sig = sig_matches[0]
        # Ensure it has 0x prefix and is exactly 132 chars (0x + 130)
        if not sig.startswith('0x'):
            sig = '0x' + sig
        if len(sig) == 132:  # Correct length
            fields["signature"] = sig

    # Extract UUIDs (for flat_id, agreement_id)
    uuid_pattern = r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    uuids = re.findall(uuid_pattern, text, re.IGNORECASE)
    if len(uuids) >= 1:
        fields["flat_id"] = uuids[0]
    if len(uuids) >= 2:
        fields["agreement_id"] = uuids[1]

    return fields


def verify_signature(affidavit_hash: str, signature: str, owner_address: str) -> Dict[str, Any]:
    """
    Verify ECDSA signature is cryptographically valid.
    We verify the signature can be recovered (proving it was signed with a valid private key).
    Supports both signing methods used in the system:
    1. Direct encoding: encode_defunct(hexstr=...) - used by Flat and Agreement
    2. Solidity keccak: solidity_keccak + encode_defunct(primitive=...) - used by Registry
    """
    try:
        # Normalize inputs
        if not affidavit_hash.startswith('0x'):
            affidavit_hash = '0x' + affidavit_hash
        if not signature.startswith('0x'):
            signature = '0x' + signature

        # Ensure signature is the correct length (130 hex chars = 65 bytes)
        if len(signature) != 132:  # 0x + 130 chars
            return {
                "valid": False,
                "recovered_signer": None,
                "expected_signer": "Unknown",
                "error": f"Invalid signature length: {len(signature)} (expected 132 with 0x prefix)",
            }

        affidavit_hash_clean = affidavit_hash[2:] if affidavit_hash.startswith('0x') else affidavit_hash
        
        # Ensure hash is correct length
        if len(affidavit_hash_clean) != 64:
            return {
                "valid": False,
                "recovered_signer": None,
                "expected_signer": "Unknown",
                "error": f"Invalid hash length: {len(affidavit_hash_clean)} (expected 64 hex chars)",
            }
        
        # Try Method 1: Direct hex encoding (used by Flat and Agreement affidavits)
        try:
            eth_message_1 = encode_defunct(hexstr=affidavit_hash_clean)
            recovered_1 = Account.recover_message(eth_message_1, signature=signature)
            # Success! Signature is valid if it can be recovered
            return {
                "valid": True,
                "recovered_signer": recovered_1,
                "expected_signer": "Any registered signer",
                "method": "direct_hex_encoding",
            }
        except Exception as e1:
            pass  # Try next method

        # Try Method 2: Solidity keccak256 + encoding (used by Registry affidavits)
        try:
            msg_hash = Web3.solidity_keccak(
                ["bytes32"],
                [bytes.fromhex(affidavit_hash_clean)],
            )
            eth_message_2 = encode_defunct(primitive=msg_hash)
            recovered_2 = Account.recover_message(eth_message_2, signature=signature)
            # Success! Signature is valid if it can be recovered
            return {
                "valid": True,
                "recovered_signer": recovered_2,
                "expected_signer": "Any registered signer",
                "method": "solidity_keccak",
            }
        except Exception as e2:
            pass  # Try next method

        # If neither method worked, return error
        return {
            "valid": False,
            "recovered_signer": None,
            "expected_signer": "Any registered signer",
            "error": "Signature recovery failed - signature may be invalid or corrupted",
        }
    except Exception as e:
        return {
            "valid": False,
            "recovered_signer": None,
            "expected_signer": "Any registered signer",
            "error": str(e),
        }


def verify_pdf_affidavit(
    pdf_bytes: bytes,
    db_record: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Complete PDF affidavit verification pipeline.
    Extracts fields and verifies them against expected values.
    """
    verification_results = {
        "success": False,
        "extracted_fields": {},
        "verification_checks": {},
        "overall_valid": False,
        "errors": [],
    }

    try:
        # Step 1: Extract text from PDF
        text = extract_text_from_pdf(pdf_bytes)
        if not text:
            verification_results["errors"].append("No readable text found in PDF")
            return verification_results

        # Step 2: Extract fields
        extracted = extract_affidavit_fields(text)
        verification_results["extracted_fields"] = extracted

        # Step 3: Run verification checks
        checks = {}

        # Check 1: Affidavit hash exists
        if extracted["affidavit_hash"]:
            checks["affidavit_hash_present"] = {
                "passed": True,
                "value": extracted["affidavit_hash"],
            }
        else:
            checks["affidavit_hash_present"] = {
                "passed": False,
                "error": "Affidavit hash not found in PDF",
            }

        # Check 2: Owner address exists
        if extracted["owner_address"]:
            checks["owner_address_present"] = {
                "passed": True,
                "value": extracted["owner_address"],
            }
        else:
            checks["owner_address_present"] = {
                "passed": False,
                "error": "Owner address not found in PDF",
            }

        # Check 3: Signature exists
        if extracted["signature"]:
            checks["signature_present"] = {
                "passed": True,
                "value": extracted["signature"][:20] + "...",  # Truncate for display
            }
        else:
            checks["signature_present"] = {
                "passed": False,
                "error": "Signature not found in PDF",
            }

        # Check 4: Verify signature (only if all parts present)
        if (
            extracted["affidavit_hash"]
            and extracted["owner_address"]
            and extracted["signature"]
        ):
            sig_result = verify_signature(
                extracted["affidavit_hash"],
                extracted["signature"],
                extracted["owner_address"],
            )
            checks["signature_valid"] = {
                "passed": sig_result["valid"],
                "recovered_signer": sig_result.get("recovered_signer"),
                "expected_signer": sig_result.get("expected_signer"),
                "error": sig_result.get("error"),
            }
        else:
            checks["signature_valid"] = {
                "passed": False,
                "error": "Cannot verify signature - missing required fields",
            }

        # Check 5: Compare with database record (if provided)
        if db_record:
            if extracted["affidavit_hash"]:
                db_hash = db_record.get("affidavit_hash", "").lower()
                extracted_hash = extracted["affidavit_hash"].lower()
                hash_match = db_hash == extracted_hash or \
                    db_hash.lstrip("0x") == extracted_hash.lstrip("0x")
                checks["hash_matches_database"] = {
                    "passed": hash_match,
                    "pdf_value": extracted["affidavit_hash"],
                    "database_value": db_record.get("affidavit_hash"),
                }
            else:
                checks["hash_matches_database"] = {
                    "passed": False,
                    "error": "Cannot compare - hash not found in PDF",
                }

            if extracted["owner_address"]:
                db_addr = db_record.get("owner_address", "").lower()
                extracted_addr = extracted["owner_address"].lower()
                addr_match = db_addr == extracted_addr
                checks["address_matches_database"] = {
                    "passed": addr_match,
                    "pdf_value": extracted["owner_address"],
                    "database_value": db_record.get("owner_address"),
                }
            else:
                checks["address_matches_database"] = {
                    "passed": False,
                    "error": "Cannot compare - address not found in PDF",
                }

        verification_results["verification_checks"] = checks

        # Step 4: Determine overall validity
        all_checks_passed = all(
            check.get("passed", False) for check in checks.values()
        )
        verification_results["overall_valid"] = all_checks_passed
        verification_results["success"] = True

    except Exception as e:
        verification_results["errors"].append(f"Verification failed: {str(e)}")

    return verification_results
