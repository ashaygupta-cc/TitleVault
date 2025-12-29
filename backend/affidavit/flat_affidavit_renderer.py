from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import black
from datetime import datetime
from pathlib import Path

from affidavit.qr import draw_qr_code
from affidavit.agreement_qr_payload import build_agreement_qr_payload

PAGE_BOTTOM = 30 * mm


# --------------------------------------------------
# WATERMARK
# --------------------------------------------------

def draw_watermark(c, text, width, height):
    c.saveState()
    c.setFont("Helvetica-Bold", 40)
    c.setFillGray(0.92)
    c.translate(width / 2, height / 2)
    c.rotate(45)
    c.drawCentredString(0, 0, text)
    c.restoreState()


# --------------------------------------------------
# SAFE PARAGRAPH RENDERER
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
        test_line = line + word + " "
        if c.stringWidth(test_line, font, font_size) <= max_width:
            line = test_line
        else:
            text_obj.textLine(line)
            line = word + " "

    if line:
        text_obj.textLine(line)

    c.drawText(text_obj)
    return text_obj.getY() - leading


# --------------------------------------------------
# MAIN RENDERER
# --------------------------------------------------

def render_flat_affidavit_pdf(affidavit: dict, output_path: str):
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    y = height - 30 * mm
    line = 7 * mm

    checksum = affidavit["affidavit_hash"][2:12].upper()
    draw_watermark(c, f"CHECKSUM {checksum}", width, height)

    # ---------------- HELPERS ----------------

    def ensure_space(lines=1):
        nonlocal y
        if y - (lines * line) < PAGE_BOTTOM:
            c.showPage()
            draw_watermark(c, f"CHECKSUM {checksum}", width, height)
            y = height - 30 * mm

    def draw_line(text, bold=False, size=10):
        nonlocal y
        ensure_space()
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.setFillColor(black)
        c.drawString(25 * mm, y, text)
        y -= line

    # ---------------- HEADER ----------------

    draw_line("BLOCKCHAIN LAND REGISTRY", bold=True, size=16)
    draw_line("Flat Ownership Agreement Affidavit", bold=True, size=14)

    y -= 5 * mm
    draw_line(f"Schema Version: {affidavit['schema_version']}")
    draw_line(f"Chain ID: {affidavit['chain_id']}")
    draw_line(f"Generated At: {affidavit['generated_at']}")

    # ---------------- A. FLAT DETAILS ----------------

    y -= 6 * mm
    draw_line("A. Flat Details", bold=True, size=12)

    flat = affidavit["flat"]
    draw_line(f"Flat ID: {flat['flat_id']}")
    draw_line(f"Flat Number: {flat['flat_number']}")
    draw_line(f"Building ID: {flat['building_id']}")
    draw_line(f"Land Record Hash: {flat['land_record_hash']}")
    draw_line(f"Current Owner: {flat['owner_address']}")

    # ---------------- B. AGREEMENT DETAILS ----------------

    y -= 6 * mm
    draw_line("B. Agreement Details", bold=True, size=12)

    ag = affidavit["agreement"]
    draw_line(f"Agreement Hash: {ag['agreement_hash']}")
    draw_line(f"Activation Transaction: {ag['activation_tx']}")
    draw_line(f"Agreement Status: {ag['status']}")
    draw_line(f"Activated At: {ag['activated_at']}")

    # ---------------- C. AFFIRMATION ----------------

    y -= 6 * mm
    draw_line("C. Affirmation", bold=True, size=12)

    y = draw_paragraph(
        c,
        affidavit["affirmation"],
        25 * mm,
        y,
        160 * mm,
        font="Helvetica-Bold",
        font_size=10,
    )

    # ---------------- D. REGISTRAR ATTESTATION ----------------

    y -= 6 * mm
    draw_line("D. Registrar Attestation", bold=True, size=12)

    y = draw_paragraph(
        c,
        (
            "This affidavit is issued under the authority of the Blockchain Land "
            "Registry Registrar and reflects canonical registry state at the time "
            "of issuance."
        ),
        25 * mm,
        y,
        160 * mm,
    )

    draw_line(f"Registrar Address: {affidavit['registrar_address']}")

    # ---------------- E. REGISTRAR SIGNATURE ----------------

    y -= 8 * mm
    draw_line("E. Registrar Signature", bold=True, size=12)

    y -= 4 * mm
    c.setFont("Helvetica", 11)
    c.drawString(25 * mm, y, "Registrar Signature :")

    sig_img = Path("assets/signature.jpeg")
    if sig_img.exists():
        c.drawImage(
            str(sig_img),
            75 * mm,
            y - 6 * mm,
            width=55 * mm,
            height=18 * mm,
            mask="auto",
        )

    y -= 12 * mm
    draw_line(f"Date: {datetime.now().strftime('%d-%m-%Y')}")
    draw_line(f"Time: {datetime.now().strftime('%I:%M:%S %p')}")

    # ---------------- F. CRYPTOGRAPHIC ATTESTATION ----------------

    y -= 10 * mm
    draw_line("F. Cryptographic Attestation", bold=True, size=12)

    y -= 4 * mm
    draw_line("Affidavit Hash (keccak256):", bold=True)
    draw_line(affidavit["affidavit_hash"])

    y -= 2 * mm
    draw_line("Registrar Address:", bold=True)
    draw_line(affidavit["registrar_address"])

    y -= 4 * mm
    draw_line("Digital Signature:", bold=True)

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
        font_size=8,
        leading=12,
    )

    draw_line(
        "Signature Algorithm: secp256k1 (Ethereum ECDSA)",
        bold=True,
    )

    # ---------------- QR (FAIL-SAFE) ----------------

    try:
        qr_payload = build_agreement_qr_payload(affidavit)
        draw_qr_code(c, qr_payload, 150, 25, 35)
        c.setFont("Helvetica", 8)
        c.drawString(150 * mm, 22 * mm, "Offline-verifiable affidavit QR")
    except Exception:
        c.setFont("Helvetica", 8)
        c.drawString(25 * mm, 22 * mm, "QR unavailable")

    # ---------------- FINALIZE ----------------

    c.save()
