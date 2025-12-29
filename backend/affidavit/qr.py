import qrcode
from io import BytesIO
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import mm

def draw_qr_code(
    canvas,
    data: str,
    x_mm: float,
    y_mm: float,
    size_mm: float = 35
):
    """
    Draws a QR code on the PDF canvas.

    canvas  : reportlab canvas
    data    : string to encode
    x_mm,y_mm : position in mm
    size_mm: QR size
    """
    qr = qrcode.make(data)
    buffer = BytesIO()
    qr.save(buffer, format="PNG")
    buffer.seek(0)

    canvas.drawImage(
        ImageReader(buffer),
        x_mm * mm,
        y_mm * mm,
        size_mm * mm,
        size_mm * mm
    )
