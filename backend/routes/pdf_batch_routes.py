# backend/routes/pdf_batch_routes.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import tempfile, zipfile, os

from models import Agreement, SessionLocal
from affidavit.agreement_renderer import render_agreement_pdf
from routes.agreement_affidavit_routes import _build_agreement_affidavit
from routes.agreement_enforcement_routes import enforce_agreement

router = APIRouter(tags=["PDF Export"])


@router.post("/export/batch")
def batch_export_agreements(data: dict):
    """
    ADMIN UTILITY ONLY (NOT COURT EVIDENCE)

    data = {
      "agreement_ids": [id1, id2, ...]
    }
    """

    ids = data.get("agreement_ids")
    if not ids or not isinstance(ids, list):
        raise HTTPException(400, "agreement_ids must be a non-empty list")

    db = SessionLocal()

    # ZIP must persist after response
    tmp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    zip_path = tmp_zip.name
    tmp_zip.close()  # 🔴 REQUIRED on Windows

    try:
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for aid in ids:
                agreement = db.query(Agreement).get(aid)
                if not agreement:
                    continue

                # ---- Create temp PDF ----
                tmp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
                pdf_path = tmp_pdf.name
                tmp_pdf.close()  # 🔴 REQUIRED on Windows

                # ---- Build affidavit correctly ----
                enforcement = enforce_agreement(aid, db)
                affidavit = _build_agreement_affidavit(
                    agreement=agreement,
                    enforcement=enforcement,
                )

                # ---- Render PDF ----
                render_agreement_pdf(
                    affidavit=affidavit,
                    output_path=pdf_path,
                )

                # ---- Add to ZIP ----
                zipf.write(
                    pdf_path,
                    arcname=f"agreement_{aid}.pdf"
                )

                # ❌ DO NOT os.unlink(pdf_path) on Windows
                # Temp directory cleanup is handled by OS

        return FileResponse(
            path=zip_path,
            filename="agreements_batch_export.zip",
            media_type="application/zip",
        )

    finally:
        db.close()
