import io

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# Mirrors receipt_pdf.py / frontend/src/theme.js so every generated document reads
# as the same product.
BROWN_800 = colors.HexColor("#3f2d20")
BROWN_700 = colors.HexColor("#5c4530")
BROWN_600 = colors.HexColor("#7a6a5c")
CREAM_50 = colors.HexColor("#fffaf5")
CREAM_200 = colors.HexColor("#e8d5b7")
ACCENT = colors.HexColor("#a0622a")
SUCCESS = colors.HexColor("#4caf50")
ERROR = colors.HexColor("#c0392b")

RENT_STATUS_COLORS = {
    "paid": SUCCESS,
    "overdue": ERROR,
    "pending": ACCENT,
    "partially_paid": ACCENT,
}


def _rent_status_label(status):
    if not status:
        return "—"
    return "Partially paid" if status == "partially_paid" else status.capitalize()


def generate_units_report_pdf(
    *,
    building_name: str,
    building_location: str,
    filters_label: str,
    generated_at: str,
    rows: list[dict],
) -> bytes:
    """A multi-page units report (uses platypus rather than raw canvas since the
    row count is unbounded — platypus repeats the header row across page breaks
    automatically, which manual canvas positioning can't do)."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=18 * mm, leftMargin=16 * mm, rightMargin=16 * mm
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title", parent=styles["Title"], textColor=BROWN_800, alignment=TA_CENTER, fontName="Helvetica-Bold", fontSize=22
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        textColor=BROWN_800,
        alignment=TA_CENTER,
        fontSize=14,
        fontName="Helvetica-Bold",
        spaceBefore=6,
    )
    meta_style = ParagraphStyle(
        "Meta", parent=styles["Normal"], textColor=BROWN_600, alignment=TA_CENTER, fontSize=9, spaceBefore=4
    )

    elements = [
        Paragraph("Nyumba", title_style),
        Paragraph(f"Units Report — {building_name}", subtitle_style),
        Paragraph(f"{building_location} &nbsp;&middot;&nbsp; Filters: {filters_label}", meta_style),
        Paragraph(f"Generated {generated_at} &nbsp;&middot;&nbsp; {len(rows)} unit(s)", meta_style),
        Spacer(1, 8 * mm),
    ]

    table_data = [["Unit", "Floor", "Status", "Tenant", "Contact", "Rent status"]]
    for r in rows:
        table_data.append(
            [
                r["unit_number"],
                r["floor"] or "—",
                r["status"].capitalize(),
                r["tenant_name"] or "—",
                r["tenant_phone"] or "—",
                _rent_status_label(r["rent_status"]),
            ]
        )

    table = Table(
        table_data,
        repeatRows=1,
        colWidths=[20 * mm, 18 * mm, 24 * mm, 42 * mm, 38 * mm, 28 * mm],
    )

    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), CREAM_200),
        ("TEXTCOLOR", (0, 0), (-1, 0), BROWN_800),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), BROWN_700),
        ("GRID", (0, 0), (-1, -1), 0.5, CREAM_200),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for i, r in enumerate(rows, start=1):
        if i % 2 == 0:
            commands.append(("BACKGROUND", (0, i), (-1, i), CREAM_50))
        color = RENT_STATUS_COLORS.get(r["rent_status"])
        if color:
            commands.append(("TEXTCOLOR", (5, i), (5, i), color))
            commands.append(("FONTNAME", (5, i), (5, i), "Helvetica-Bold"))
    table.setStyle(TableStyle(commands))
    elements.append(table)

    if not rows:
        elements.append(Spacer(1, 10 * mm))
        elements.append(Paragraph("No units match these filters.", meta_style))

    doc.build(elements)
    return buffer.getvalue()
