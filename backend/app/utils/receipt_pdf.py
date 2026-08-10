import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# Mirrors welcome_email.py / frontend/src/theme.js so the PDF reads as the same
# product as the email it's attached to.
BROWN_800 = colors.HexColor("#3f2d20")
BROWN_600 = colors.HexColor("#7a6a5c")
ACCENT = colors.HexColor("#a0622a")
CREAM_200 = colors.HexColor("#e8d5b7")

METHOD_LABELS = {"mpesa": "M-Pesa", "cash": "Cash", "bank_transfer": "Bank transfer"}


def generate_rent_receipt_pdf(
    *,
    tenant_name: str,
    building_name: str,
    unit_number: str,
    period_label: str,
    amount: float,
    method: str,
    reference: str,
    paid_at: str,
) -> bytes:
    """Renders a one-page PDF receipt matching the payment-confirmation email's
    layout, for attaching to that same email."""
    buffer = io.BytesIO()
    doc = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 22 * mm
    y = height - margin

    doc.setFont("Helvetica-Bold", 22)
    doc.setFillColor(BROWN_800)
    doc.drawCentredString(width / 2, y, "Nyumba")

    y -= 8 * mm
    doc.setStrokeColor(CREAM_200)
    doc.setLineWidth(1)
    doc.line(margin, y, width - margin, y)

    y -= 14 * mm
    doc.setFont("Helvetica-Bold", 15)
    doc.setFillColor(BROWN_800)
    doc.drawCentredString(width / 2, y, f"Payment Receipt — {period_label}")

    y -= 10 * mm
    doc.setFont("Helvetica", 10)
    doc.setFillColor(BROWN_600)
    doc.drawCentredString(width / 2, y, f"Issued to {tenant_name}")

    y -= 14 * mm
    rows = [
        ("Building", building_name),
        ("Unit", unit_number),
        ("Period", period_label),
        ("Amount paid", f"KES {amount:,.2f}"),
        ("Payment method", METHOD_LABELS.get(method, method)),
        ("Reference", reference),
        ("Paid on", paid_at),
    ]
    row_height = 11 * mm
    for label, value in rows:
        doc.setFont("Helvetica", 10)
        doc.setFillColor(BROWN_600)
        doc.drawString(margin, y, label)
        doc.setFont("Helvetica-Bold", 10)
        doc.setFillColor(BROWN_800)
        doc.drawRightString(width - margin, y, value)
        y -= 4 * mm
        doc.setStrokeColor(CREAM_200)
        doc.setLineWidth(0.5)
        doc.line(margin, y, width - margin, y)
        y -= row_height - 4 * mm

    y -= 6 * mm
    doc.setFont("Helvetica-Oblique", 9)
    doc.setFillColor(BROWN_600)
    doc.drawCentredString(width / 2, y, "Keep this receipt for your records.")

    doc.showPage()
    doc.save()
    return buffer.getvalue()
