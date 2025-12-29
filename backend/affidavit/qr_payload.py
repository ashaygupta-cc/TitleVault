# affidavit/qr_payload.py
import json

def build_affidavit_qr_payload(affidavit: dict) -> dict:

    record = affidavit["record"]

    # --- Bounding box (if present in affidavit metadata)
    bbox = affidavit.get("geometry", {}).get("bbox")

    payload = {
        "type": "LAND_REGISTRY_AFFIDAVIT",
        "version": "1.0",

        # --- Core identifiers
        "record_hash": record["record_hash"],
        "affidavit_hash": affidavit["affidavit_hash"],

        # --- Registry facts (non-sensitive)
        "area_m2": affidavit.get("geometry", {}).get("area_m2"),
        "is_subdivided": affidavit.get("geometry", {}).get("is_subdivided"),
        "bbox": bbox,

        # --- Anchoring
        "merkle_root": affidavit["anchoring"]["root"],
        "tx_hash": affidavit["anchoring"]["tx_hash"],
        "block_number": affidavit["anchoring"]["block_number"],

        # --- Signature
        "signer": affidavit["signature"]["signer"],
        "signature": affidavit["signature"]["signature"],
    }

    return payload
