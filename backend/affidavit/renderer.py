from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import blue, black
from datetime import datetime
from pathlib import Path

from affidavit.qr import draw_qr_code
from affidavit.qr_payload import build_affidavit_qr_payload
from config import settings

PAGE_BOTTOM = 35 * mm


def draw_paragraph(c, text, x, y, max_width, font="Helvetica", font_size=10, leading=14):
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


def render_affidavit_pdf(affidavit: dict, output_path: str):
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4

    y = height - 30 * mm
    line_height = 7 * mm

    # ---------------- WATERMARK ----------------
    def draw_watermark(c, text):
        c.saveState()
        c.setFont("Helvetica-Bold", 40)
        c.setFillGray(0.9)
        c.translate(300, 400)
        c.rotate(45)
        c.drawCentredString(0, 0, text)
        c.restoreState()

    checksum = affidavit["affidavit_hash"][2:12].upper()
    draw_watermark(c, f"CHECKSUM {checksum}")

    # ---------------- HELPERS ----------------
    def ensure_space(lines=1):
        nonlocal y
        if y - (lines * line_height) < PAGE_BOTTOM:
            c.showPage()
            c.setFont("Helvetica", 10)
            draw_watermark(c, f"CHECKSUM {checksum}")
            y = height - 30 * mm

    def draw_line(text, font="Helvetica", font_size=10):
        nonlocal y
        ensure_space(1)
        c.setFont(font, font_size)
        c.drawString(25 * mm, y, text)
        y -= line_height

    # ---------------- HEADER ----------------
    draw_line("BLOCKCHAIN LAND REGISTRY", "Helvetica-Bold", 16)
    draw_line("Merkle Inclusion Affidavit", "Helvetica-Bold", 14)

    y -= 6 * mm
    draw_line(f"Network: {affidavit['network']}")
    draw_line(f"Generated At: {affidavit['generated_at']}")

    # ---------------- A. RECORD ----------------
    y -= 6 * mm
    draw_line("A. Property Record", "Helvetica-Bold", 12)

    rec = affidavit["record"]
    draw_line(f"Record Hash: {rec['record_hash']}")
    draw_line(f"Canonical Hash: {rec['canonical_hash']}")
    draw_line(f"Owner Address: {rec['owner_address']}")
    draw_line(f"Parent Record: {rec['parent_record']}")
    draw_line(f"IPFS CID: {rec['cid']}")

    # ---------------- B. MERKLE PROOF ----------------
    y -= 6 * mm
    draw_line("B. Merkle Proof", "Helvetica-Bold", 12)

    mp = affidavit["merkle_proof"]
    draw_line(f"Leaf: {mp['leaf']}")
    draw_line(f"Index: {mp['index']}")
    draw_line("Proof:")

    for p in mp["proof"]:
        draw_line(f"  - {p}")

    # ---------------- C. ANCHORING ----------------
    y -= 6 * mm
    draw_line("C. Anchoring", "Helvetica-Bold", 12)

    a = affidavit["anchoring"]
    draw_line(f"Merkle Root: {a['root']}")
    draw_line(f"Transaction Hash: {a['tx_hash']}")
    draw_line(f"Block Number: {a['block_number']}")
    draw_line(f"Anchored At: {a['anchored_at']}")

    ensure_space(3)
    draw_line("View on Ethereum Explorer:")

    c.setFillColor(blue)
    display_url = f"{settings.ETH_EXPLORER_BASE}/tx/…"
    text_x = 25 * mm
    text_y = y
    c.drawString(text_x, text_y, display_url)

    text_width = c.stringWidth(display_url, "Helvetica", 10)
    c.linkURL(
        f"{settings.ETH_EXPLORER_BASE}/tx/{a['tx_hash']}",
        rect=(text_x, text_y - 2, text_x + text_width, text_y + 10),
        relative=0,
    )

    c.setFillColor(black)
    y -= 14 * mm

    # ---------------- D. VERIFICATION ----------------
    draw_line("D. Verification", "Helvetica-Bold", 12)

    v = affidavit["verification"]
    draw_line(f"Hash Function: {v['hash_function']}")
    draw_line(f"Result: {'VALID' if v['valid'] else 'INVALID'}")

    # ---------------- E. AFFIRMATION ----------------
    y -= 6 * mm

    ensure_space(8)

    draw_line("E. Affirmation", "Helvetica-Bold", 12)

    y = draw_paragraph(
        c,
        affidavit["affirmation"],
        25 * mm,
        y,
        160 * mm,
        font="Helvetica-Bold",
        font_size=10.5,
        leading=14,
    )

    # ---------------- SIGNATURE ----------------
    y -= 4 * mm
    ensure_space(4)
    
    c.setFont("Helvetica",10)

    c.drawString(25 * mm, y, "Registrar Signature:")
    signature_path = Path("assets/signature.jpeg")

    if signature_path.exists():
        c.drawImage(
            str(signature_path),
            60 * mm,
            y - 13,
            width=50 * mm,
            height=15 * mm,
            mask="auto",
        )

    y -= 12 * mm
    draw_line(f"Date: {datetime.now().strftime('%d-%m-%Y')}")
    draw_line(f"Time: {datetime.now().strftime('%I:%M:%S %p')}")

    # ---------------- F. CRYPTO ----------------
    y -= 6 * mm
    draw_line("F. Cryptographic Attestation", "Helvetica-Bold", 12)

    draw_line("Affidavit Hash (keccak256):")
    draw_line(affidavit["affidavit_hash"])

    draw_line("Registrar Address:")
    draw_line(affidavit["signature"]["signer"])

    draw_line("Digital Signature:")
    ensure_space(6)
    y = draw_paragraph(
        c,
        affidavit["signature"]["signature"],
        25 * mm,
        y + 10,
        160 * mm,
        font="Helvetica",
        font_size=7,
        leading=12,
    )

    draw_line("Signature Algorithm: secp256k1 (Ethereum ECDSA)")

    # ---------------- QR ----------------
    ensure_space(8)
    qr_payload = build_affidavit_qr_payload(affidavit)
    draw_qr_code(c, qr_payload, 150, 25, 35)

    c.setFont("Helvetica", 8)
    c.drawString(150 * mm, 22 * mm, "Offline-verifiable affidavit QR")

    c.showPage()
    c.save()
