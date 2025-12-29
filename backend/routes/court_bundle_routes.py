# backend/routes/court_bundle_routes.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import tempfile, zipfile, json, os, hashlib
from web3 import Web3

from datetime import datetime

from models import Agreement, PropertyRecord, FlatUnit, get_db
from affidavit.agreement_renderer import render_agreement_pdf
from affidavit.flat_affidavit_renderer import render_flat_affidavit_pdf
from routes.agreement_affidavit_routes import _build_agreement_affidavit
from merkle.utils import agreement_leaf_hash
from merkle.tree import build_merkle_tree
from merkle.proof import generate_proof
from shapely.wkb import loads

router = APIRouter(
    tags=["Court Bundle"]
)


# -----------------------------
# Helpers
# -----------------------------

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: str, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def build_gis_appendix(record: PropertyRecord):
    geom = loads(bytes(record.geom.data))
    return {
        "record_hash": "0x" + record.record_hash.hex(),
        "geometry_wkt": geom.wkt,
        "area_m2": record.area_m2,
        "parent_record": (
            "0x" + record.parent_record.hex()
            if record.parent_record else None
        ),
        "note": "Court GIS Appendix – authoritative geometry snapshot",
    }

def _subject_id_to_bytes(subject_id: str) -> bytes:
    """
    Deterministic subject ID hashing (LAND / FLAT safe)
    """
    return Web3.keccak(text=subject_id)



# -----------------------------
# POST /court/bundle/{agreement_id}
# -----------------------------

@router.post("/{agreement_id}")
def generate_court_bundle(
    agreement_id: str,
    db: Session = Depends(get_db),
):
    agreement = db.query(Agreement).get(agreement_id)
    if not agreement:
        raise HTTPException(404, "Agreement not found")

    tmp_dir = tempfile.mkdtemp(prefix="court_bundle_")
    zip_path = os.path.join(
        tempfile.gettempdir(),
        f"court_bundle_{agreement_id}.zip"
    )

    artifacts = []
    checksums = {}

    # -----------------------------
    # AGREEMENT AFFIDAVIT
    # -----------------------------

    enforcement_snapshot = {}
    affidavit = _build_agreement_affidavit(agreement, enforcement_snapshot)

    agreement_pdf = os.path.join(tmp_dir, f"agreement_{agreement_id}.pdf")
    render_agreement_pdf(
        affidavit=affidavit,
        output_path=agreement_pdf,
    )

    artifacts.append(agreement_pdf)
    checksums["agreement_pdf"] = sha256_file(agreement_pdf)

    # -----------------------------
    # SUBJECT-SPECIFIC ARTIFACTS
    # -----------------------------

    if agreement.subject_type == "LAND":
        record = db.query(PropertyRecord).filter(
            PropertyRecord.record_hash ==
            bytes.fromhex(agreement.subject_id[2:])
        ).first()

        if not record:
            raise HTTPException(404, "Land record not found")

        gis_data = build_gis_appendix(record)
        gis_path = os.path.join(tmp_dir, "gis_appendix.json")
        write_json(gis_path, gis_data)

        artifacts.append(gis_path)
        checksums["gis_appendix"] = sha256_file(gis_path)

    else:  # FLAT
        flat = db.query(FlatUnit).get(agreement.subject_id)
        if not flat:
            raise HTTPException(404, "Flat not found")

        flat_pdf = os.path.join(tmp_dir, f"flat_affidavit_{flat.id}.pdf")
        render_flat_affidavit_pdf(
            output_path=flat_pdf,
            flat=flat,
            agreement=agreement,
        )

        artifacts.append(flat_pdf)
        checksums["flat_affidavit"] = sha256_file(flat_pdf)

    # -----------------------------
    # MERKLE SUMMARY + PROOF
    # -----------------------------

    active = db.query(Agreement).filter(
        Agreement.status == "ACTIVE"
    ).all()

    pairs = [
        (_subject_id_to_bytes(a.subject_id), a.agreement_hash)
        for a in active
    ]

    leaves = [
        agreement_leaf_hash(sid, ah)
        for sid, ah in sorted(pairs)
    ]

    tree = build_merkle_tree(leaves)
    root = tree[-1][0] 

    target_leaf = agreement_leaf_hash(
    _subject_id_to_bytes(agreement.subject_id),
    agreement.agreement_hash,
    )

    index = leaves.index(target_leaf)
    proof = generate_proof(tree, index)

    merkle_summary = {
        "merkle_root": "0x" + root.hex(),
        "leaf": "0x" + target_leaf.hex(),
        "index": index,
        "proof": ["0x" + p.hex() for p in proof],
        "active_agreements": len(leaves),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

    merkle_path = os.path.join(tmp_dir, "merkle_summary.json")
    write_json(merkle_path, merkle_summary)

    artifacts.append(merkle_path)
    checksums["merkle_summary"] = sha256_file(merkle_path)

    # -----------------------------
    # MANIFEST
    # -----------------------------

    manifest = {
        "bundle_type": "COURT_EVIDENCE",
        "agreement_id": agreement_id,
        "artifacts": [os.path.basename(a) for a in artifacts],
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

    manifest_path = os.path.join(tmp_dir, "MANIFEST.json")
    write_json(manifest_path, manifest)

    artifacts.append(manifest_path)
    checksums["MANIFEST"] = sha256_file(manifest_path)

    # -----------------------------
    # CHECKSUMS
    # -----------------------------

    checksum_path = os.path.join(tmp_dir, "checksums.json")
    write_json(checksum_path, checksums)
    artifacts.append(checksum_path)

    # -----------------------------
    # ZIP FINALIZATION
    # -----------------------------

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for file in artifacts:
            z.write(file, arcname=os.path.basename(file))

    return FileResponse(
        zip_path,
        filename=os.path.basename(zip_path),
        media_type="application/zip",
    )
