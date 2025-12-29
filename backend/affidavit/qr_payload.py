# affidavit/qr_payload.py
import json

def build_affidavit_qr_payload(affidavit: dict) -> dict:

    record = affidavit["record"]
    geometry = affidavit.get("geometry", {})
    anchoring = affidavit["anchoring"]
    merkle = affidavit["merkle_proof"]

    payload = {
        "type": "LAND_REGISTRY_AFFIDAVIT_QR",
        "version": "1.0",

        # --- Schema context
        "schema_version": affidavit.get("schema_version", "1.0.0"),

        # --- Chain context
        "network": affidavit.get("network"),
        "chain_id": anchoring.get("chain_id"),

        # --- Core identifiers
        "record_hash": record["record_hash"],
        "affidavit_hash": affidavit["affidavit_hash"],

        # --- Geometry summary (safe)
        "area_m2": geometry.get("area_m2"),
        "is_subdivided": geometry.get("is_subdivided"),
        "bbox": geometry.get("bbox"),

        # --- Merkle context
        "merkle_root": anchoring["root"],
        "leaf_index": merkle.get("index"),

        # --- Blockchain anchor
        "tx_hash": anchoring["tx_hash"],
        'block_number': int(affidavit["anchoring"]["block_number"]),

        # --- Signature
        "signer": affidavit["signature"]["signer"],
        "signature": affidavit["signature"]["signature"],
    }

    return payload
