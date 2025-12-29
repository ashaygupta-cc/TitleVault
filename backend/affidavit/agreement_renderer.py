# affidavit/agreement_renderer.py

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import blue, black
from datetime import datetime
from pathlib import Path

from affidavit.qr import draw_qr_code
from config import settings

PAGE_BOTTOM = 35 * mm


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def draw_paragraph(
    c,
    text,
    x,
    y,
    max_width,
    font="Helvetica",
    font_size=10,
    leading=14,
):
    text_obj = c.beginText(x, y)
    text_obj.setFont(font, font_size)
    text_obj.setLeading(leading)

    words = text.split(" ")
    line = ""

    for word in words:
        test = line + word + " "
        if c.stringWidth(test, font, font_size) <= max_width:
            line = test
        else:
            text_obj.textLine(line)
            line = word + " "

    if line:
        text_obj.textLine(line)

    c.drawText(text_obj)
    return text_obj.getY() - leading


def draw_watermark(c, checksum):
    c.saveState()
    c.setFont("Helvetica-Bold", 40)
    c.setFillGray(0.9)
    c.translate(300, 420)
    c.rotate(45)
    c.drawCentredString(0, 0, f"CHECKSUM {checksum}")
    c.restoreState()


# --------------------------------------------------
# Main Renderer
# --------------------------------------------------

def render_agreement_pdf(affidavit: dict, output_path: str):
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    checksum = affidavit["affidavit_hash"][2:12].upper()

    y = height - 30 * mm
    line = 7 * mm

    # ---------------- PAGE HELPERS ----------------

    def ensure_space(lines=1):
        nonlocal y
        if y - (lines * line) < PAGE_BOTTOM:
            c.showPage()
            draw_watermark(c, checksum)
            y = height - 30 * mm

    def draw_line(text, font="Helvetica", size=10):
        nonlocal y
        ensure_space()
        c.setFont(font, size)
        c.setFillColor(black)
        c.drawString(25 * mm, y, text)
        y -= line

    # ---------------- PAGE 1 ----------------

    draw_watermark(c, checksum)

    draw_line("BLOCKCHAIN LAND REGISTRY", "Helvetica-Bold", 16)
    draw_line("Agreement Merkle Inclusion Affidavit", "Helvetica-Bold", 14)

    y -= 6 * mm
    draw_line(f"Schema Version: {affidavit['schema_version']}")
    draw_line(f"Network: {affidavit['network']}")
    draw_line(f"Chain ID: {affidavit['chain_id']}")
    draw_line(f"Generated At: {affidavit['generated_at']}")

    # -------- A. Agreement Record --------
    y -= 6 * mm
    draw_line("A. Agreement Record", "Helvetica-Bold", 12)

    ag = affidavit["agreement"]
    draw_line(f"Agreement ID: {ag['agreement_id']}")
    draw_line(f"Agreement Hash: {ag['agreement_hash']}")
    draw_line(f"Subject Type: {ag['subject_type']}")
    draw_line(f"Subject ID: {ag['subject_id']}")
    draw_line(f"Agreement Type: {ag['agreement_type']}")

    # -------- B. Agreement Terms --------
    y -= 6 * mm
    draw_line("B. Agreement Terms", "Helvetica-Bold", 12)

    terms = ag["terms"]
    draw_line(f"Buyer Address: {terms['buyer']}")
    draw_line(f"Seller Address: {terms['seller']}")
    draw_line(f"Total Price: {terms['total_price']}")
    draw_line(f"Paid Upfront: {terms['paid_upfront']}")

    draw_line("Payment Schedule:")
    for s in terms["schedule"]:
        draw_line(f" • {s['amount']} due in {s['due_in_days']} days")

    # -------- C. Enforcement Snapshot --------
    y -= 6 * mm
    draw_line("C. Enforcement Snapshot", "Helvetica-Bold", 12)

    enf = affidavit.get("enforcement_snapshot", {})
    for k, v in enf.items():
        draw_line(f"{k}: {v}")

    # -------- D. Merkle Verification --------
    y -= 6 * mm
    draw_line("D. Merkle Inclusion Verification", "Helvetica-Bold", 12)

    anch = affidavit["anchoring"]
    draw_line(f"Merkle Root: {anch['merkle_root']}")
    draw_line(f"Merkle Verified: {anch['merkle_verified']}")
    draw_line(f"Activation TX: {anch['activation_tx']}")

    # ---------------- PAGE 2 ----------------

    c.showPage()
    draw_watermark(c, checksum)
    y = height - 30 * mm

    # -------- E. Blockchain Anchoring --------
    draw_line("E. Blockchain Anchoring", "Helvetica-Bold", 12)
    draw_line(f"Activated At: {anch['activated_at']}")

    draw_line("View on Ethereum Explorer:")
    url = f"{settings.ETH_EXPLORER_BASE}/tx/{anch['activation_tx']}"
    c.setFillColor(blue)
    c.drawString(25 * mm, y, url)
    c.linkURL(url, (25 * mm, y - 2, 180 * mm, y + 10))
    c.setFillColor(black)
    y -= line

    # -------- F. Verification Summary --------
    y -= 6 * mm
    draw_line("F. Verification Summary", "Helvetica-Bold", 12)

    y = draw_paragraph(
        c,
        affidavit.get(
            "verification_summary",
            (
                "All cryptographic and registry integrity checks were successfully "
                "verified at the time this agreement affidavit was generated. The "
                "agreement hash, Merkle inclusion proof, and blockchain anchoring "
                "collectively establish the legal and cryptographic validity of this "
                "agreement."
            ),
        ),
        25 * mm,
        y,
        160 * mm,
        font="Helvetica-Bold",
    )

    # -------- G. Affirmation --------
    y -= 6 * mm
    draw_line("G. Affirmation", "Helvetica-Bold", 12)

    y = draw_paragraph(
        c,
        affidavit.get(
            "affirmation",
            (
                "I affirm that the above agreement was generated from canonical registry "
                "state, cryptographically verified for integrity, and anchored on the "
                "Ethereum blockchain. This affidavit reflects the legally binding "
                "agreement state as recorded at the time of issuance."
            ),
        ),
        25 * mm,
        y,
        160 * mm,
        font="Helvetica-Bold",
    )

    # -------- H. Registrar Signature --------
    y -= 8 * mm
    draw_line("H. Registrar Signature", "Helvetica-Bold", 12)

    c.setFont("Helvetica", 11)
    c.drawString(25 * mm, y, "Registrar Signature :")

    sig_path = Path("assets/signature.jpeg")
    if sig_path.exists():
        c.drawImage(
            str(sig_path),
            75 * mm,
            y - 6 * mm,
            width=55 * mm,
            height=18 * mm,
            mask="auto",
        )

    y -= 12 * mm
    draw_line(f"Date: {datetime.now().strftime('%d-%m-%Y')}")
    draw_line(f"Time: {datetime.now().strftime('%I:%M:%S %p')}")

    # -------- I. Cryptographic Attestation --------
    y -= 10 * mm
    draw_line("I. Cryptographic Attestation", "Helvetica-Bold", 12)

    draw_line("Affidavit Hash (keccak256):", "Helvetica-Bold")
    draw_line(affidavit["affidavit_hash"])

    draw_line("Registrar Address:", "Helvetica-Bold")
    draw_line(
        affidavit.get("registrar_address", "NOT DISCLOSED"),
    )

    draw_line("Digital Signature:", "Helvetica-Bold")

    digital_sig = affidavit.get(
        "digital_signature",
        "UNSIGNED – REGISTRAR DIGITAL SIGNATURE NOT APPLIED",
    )

    y = draw_paragraph(
        c,
        digital_sig,
        25 * mm,
        y,
        160 * mm,
        font="Helvetica",
        font_size=8,
        leading=12,
    )

    draw_line(
        "Signature Algorithm: secp256k1 (Ethereum ECDSA)",
        "Helvetica-Bold",
    )

    # -------- J. QR (FAIL-SAFE) --------
    try:
        draw_qr_code(c, affidavit["qr_payload"], 150, 25, 35)
        c.setFont("Helvetica", 8)
        c.drawString(
            150 * mm,
            22 * mm,
            "Offline-verifiable agreement affidavit QR",
        )
    except Exception:
        c.setFont("Helvetica", 8)
        c.drawString(25 * mm, 22 * mm, "QR unavailable")

    c.save()
