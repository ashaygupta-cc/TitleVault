import json

def build_affidavit_qr_payload(affidavit: dict) -> str:
    payload = {
        "type": "LAND_REGISTRY_AFFIDAVIT",
        "affidavit_hash": affidavit["affidavit_hash"],
        "signer": affidavit["signature"]["signer"],
        "signature": affidavit["signature"]["signature"],
        "merkle_root": affidavit["anchoring"]["root"],
        "tx_hash": affidavit["anchoring"]["tx_hash"],
    }

    return json.dumps(payload, separators=(",", ":"))
