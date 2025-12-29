from typing import Dict


def build_agreement_qr_payload(affidavit: Dict) -> Dict:
    """
    Builds a compact, offline-verifiable QR payload.

    Supports:
    - LAND Agreement Affidavit
    - FLAT Ownership Agreement Affidavit
    """

    if "agreement" not in affidavit:
        raise ValueError("Invalid affidavit: missing agreement block")

    agreement = affidavit["agreement"]

    # --------------------------------------------------
    # SUBJECT RESOLUTION (CRITICAL FIX)
    # --------------------------------------------------
    if "subject_id" in agreement:
        # LAND / standard agreement affidavit
        subject_id = agreement["subject_id"]
        subject_type = agreement["subject_type"]

    elif "flat" in affidavit:
        # FLAT ownership affidavit
        subject_id = affidavit["flat"]["flat_id"]
        subject_type = "FLAT"

    else:
        raise ValueError("Unable to resolve subject for QR payload")

    # --------------------------------------------------
    # ACTIVATION TX (COMMON)
    # --------------------------------------------------
    activation_tx = (
        affidavit.get("anchoring", {}).get("activation_tx")
        or agreement.get("activation_tx")
    )

    if not activation_tx:
        raise ValueError("Missing activation transaction for QR payload")

    # --------------------------------------------------
    # FINAL QR PAYLOAD
    # --------------------------------------------------
    return {
        "type": "AGREEMENT_AFFIDAVIT_QR",
        "schema_version": affidavit["schema_version"],
        "chain_id": affidavit.get("chain_id"),

        "agreement_hash": agreement["agreement_hash"],
        "subject_id": subject_id,
        "subject_type": subject_type,

        "activation_tx": activation_tx,
        "generated_at": affidavit["generated_at"],
    }
