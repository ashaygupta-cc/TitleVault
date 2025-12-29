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
from routes.flat_affidavit_routes import _build_flat_affidavit

from merkle.utils import agreement_leaf_hash
from merkle.tree import build_merkle_tree
from merkle.proof import generate_proof

from shapely.wkb import loads
from config import settings

router = APIRouter(tags=["Court Bundle"])


# -------------------------------------------------
# Helpers
# -------------------------------------------------

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
    return Web3.keccak(text=subject_id)


def compute_bundle_hash(checksums: dict) -> str:
    concat = "".join(
        checksums[k] for k in sorted(checksums.keys())
    ).encode()
    return "0x" + Web3.keccak(concat).hex()


# -------------------------------------------------
# POST /court/bundle/{agreement_id}
# -------------------------------------------------

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

    # -------------------------------------------------
    # AGREEMENT AFFIDAVIT
    # -------------------------------------------------

    enforcement_snapshot = {}
    agreement_affidavit = _build_agreement_affidavit(
        agreement,
        enforcement_snapshot,
        db,
    )

    agreement_pdf = os.path.join(tmp_dir, "agreement_affidavit.pdf")
    render_agreement_pdf(
        affidavit=agreement_affidavit,
        output_path=agreement_pdf,
    )

    artifacts.append(agreement_pdf)
    checksums["agreement_affidavit.pdf"] = sha256_file(agreement_pdf)

    # -------------------------------------------------
    # SUBJECT-SPECIFIC ARTIFACTS
    # -------------------------------------------------

    if agreement.subject_type == "LAND":
        record = db.query(PropertyRecord).filter(
            PropertyRecord.record_hash ==
            bytes.fromhex(agreement.subject_id[2:])
        ).first()

        if not record:
            raise HTTPException(404, "Land record not found")

        gis_path = os.path.join(tmp_dir, "gis_appendix.json")
        write_json(gis_path, build_gis_appendix(record))

        artifacts.append(gis_path)
        checksums["gis_appendix.json"] = sha256_file(gis_path)

    elif agreement.subject_type == "FLAT":
        flat = db.query(FlatUnit).get(agreement.subject_id)
        if not flat:
            raise HTTPException(404, "Flat not found")

        flat_affidavit = _build_flat_affidavit(flat, agreement)

        flat_pdf = os.path.join(tmp_dir, "flat_affidavit.pdf")
        render_flat_affidavit_pdf(
            affidavit=flat_affidavit,
            output_path=flat_pdf,
        )

        artifacts.append(flat_pdf)
        checksums["flat_affidavit.pdf"] = sha256_file(flat_pdf)

    else:
        raise HTTPException(400, "Unsupported subject type")

    # -------------------------------------------------
    # MERKLE SUMMARY
    # -------------------------------------------------

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
    checksums["merkle_summary.json"] = sha256_file(merkle_path)

    # -------------------------------------------------
    # REGISTRAR ATTESTATION
    # -------------------------------------------------

    registrar_attestation = {
        "registry": "Blockchain Land Registry",
        "registrar_address": settings.REGISTRAR_ADDRESS,
        "statement": (
            "This court bundle was generated from canonical registry state "
            "and reflects verifiable agreement, spatial, and cryptographic records."
        ),
        "issued_at": datetime.utcnow().isoformat() + "Z",
    }

    att_path = os.path.join(tmp_dir, "registrar_attestation.json")
    write_json(att_path, registrar_attestation)

    artifacts.append(att_path)
    checksums["registrar_attestation.json"] = sha256_file(att_path)

    # -------------------------------------------------
    # README
    # -------------------------------------------------

    readme_path = os.path.join(tmp_dir, "README.txt")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(
            """COURT BUNDLE VERIFICATION GUIDE

1. Verify checksums.json against all files.
2. Verify MANIFEST.json artifact list.
3. Verify Merkle proof using merkle_summary.json.
4. Verify transaction hash on public explorer.
5. GIS appendix (if present) is authoritative geometry.

This bundle is tamper-evident and self-verifiable.
"""
        )

    artifacts.append(readme_path)
    checksums["README.txt"] = sha256_file(readme_path)

    # -------------------------------------------------
    # MANIFEST + BUNDLE HASH
    # -------------------------------------------------

    bundle_hash = compute_bundle_hash(checksums)

    manifest = {
        "bundle_type": "COURT_EVIDENCE",
        "agreement_id": agreement_id,
        "artifacts": [os.path.basename(a) for a in artifacts],
        "bundle_hash": bundle_hash,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }

    manifest_path = os.path.join(tmp_dir, "MANIFEST.json")
    write_json(manifest_path, manifest)

    artifacts.append(manifest_path)
    checksums["MANIFEST.json"] = sha256_file(manifest_path)

    # -------------------------------------------------
    # CHECKSUMS
    # -------------------------------------------------

    checksum_path = os.path.join(tmp_dir, "checksums.json")
    write_json(checksum_path, checksums)
    artifacts.append(checksum_path)

    # -------------------------------------------------
    # ZIP FINALIZATION (WINDOWS-SAFE)
    # -------------------------------------------------

    zip_path = os.path.join(
        tmp_dir,
        f"court_bundle_{agreement_id}.zip"
    )

    with zipfile.ZipFile(
        zip_path,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as z:
        for file in artifacts:
            z.write(file, arcname=os.path.basename(file))

    # 🔒 Hard integrity check (VERY important)
    if os.path.getsize(zip_path) < 1024:
        raise HTTPException(
            500,
            "Court bundle ZIP generation failed (empty or corrupted)"
        )

    return FileResponse(
        path=zip_path,
        filename=os.path.basename(zip_path),
        media_type="application/zip",
        headers={
            "Content-Disposition": (
                f'attachment; filename="court_bundle_{agreement_id}.zip"'
            )
        },
    )
