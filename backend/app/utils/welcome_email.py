import html

from flask import current_app

# Mirrors frontend/src/theme.js so the email reads as part of the same product.
BROWN_900 = "#2b1f16"
BROWN_800 = "#3f2d20"
BROWN_700 = "#5c4530"
BROWN_600 = "#7a6a5c"
CREAM_50 = "#fffaf5"
CREAM_200 = "#e8d5b7"
ACCENT = "#a0622a"


def _shell(heading: str, body_html: str, cta_label: str, cta_url: str) -> str:
    return f"""\
<div style="background:{CREAM_50};padding:40px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid {CREAM_200};border-radius:16px;padding:40px 32px;">
    <div style="text-align:center;font-size:22px;font-weight:800;margin-bottom:24px;">
      <span style="color:{BROWN_800};">Nyum</span><span style="color:{ACCENT};">ba</span>
    </div>
    <h1 style="color:{BROWN_800};font-size:20px;font-weight:700;margin:0 0 16px;text-align:center;">{heading}</h1>
    <div style="color:{BROWN_700};font-size:14px;line-height:1.7;">
      {body_html}
    </div>
    <div style="text-align:center;margin-top:32px;">
      <a href="{cta_url}" style="display:inline-block;background:{ACCENT};color:#ffffff;text-decoration:none;
        font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;">{cta_label}</a>
    </div>
    <p style="text-align:center;color:{BROWN_600};font-size:12px;margin-top:32px;">
      &copy; {_year()} Nyumba Block Manager
    </p>
  </div>
</div>"""


def _year() -> int:
    from datetime import date

    return date.today().year


def landlord_welcome_email(full_name: str) -> tuple[str, str]:
    first_name = full_name.split(" ")[0]
    login_url = f"{current_app.config['FRONTEND_URL']}/login"
    subject = "Welcome to Nyumba — let's set up your building"
    body = f"""\
      <p>Hi {first_name},</p>
      <p>Your landlord account is ready. Once you log in, you'll set up your building —
      unit types, rent, and all — and Nyumba will generate your units automatically.</p>
      <p style="margin:20px 0 8px;font-weight:700;color:{BROWN_800};">What's next:</p>
      <ul style="margin:0;padding-left:20px;">
        <li>Log in with your phone number and password</li>
        <li>Set up your building and unit types</li>
        <li>Share your building code with tenants so they can join their unit</li>
      </ul>"""
    return subject, _shell("Welcome to Nyumba", body, "Go to your dashboard", login_url)


def rent_receipt_email(
    full_name: str,
    *,
    building_name: str,
    unit_number: str,
    period_label: str,
    amount: float,
    method: str,
    reference: str,
    paid_at: str,
) -> tuple[str, str]:
    first_name = full_name.split(" ")[0]
    payments_url = f"{current_app.config['FRONTEND_URL']}/dashboard/payments"
    subject = f"Rent receipt — {period_label} — Unit {unit_number}"
    method_label = {"mpesa": "M-Pesa", "cash": "Cash", "bank_transfer": "Bank transfer"}.get(method, method)
    body = f"""\
      <p>Hi {first_name},</p>
      <p>We've received your rent payment. Here's your receipt:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr><td style="padding:6px 0;color:{BROWN_600};">Building</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:{BROWN_800};">{building_name}</td></tr>
        <tr><td style="padding:6px 0;color:{BROWN_600};">Unit</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:{BROWN_800};">{unit_number}</td></tr>
        <tr><td style="padding:6px 0;color:{BROWN_600};">Period</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:{BROWN_800};">{period_label}</td></tr>
        <tr><td style="padding:6px 0;color:{BROWN_600};">Amount paid</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:{BROWN_800};">KES {amount:,.2f}</td></tr>
        <tr><td style="padding:6px 0;color:{BROWN_600};">Payment method</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:{BROWN_800};">{method_label}</td></tr>
        <tr><td style="padding:6px 0;color:{BROWN_600};">Reference</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:{BROWN_800};">{reference}</td></tr>
        <tr><td style="padding:6px 0;color:{BROWN_600};">Paid on</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:{BROWN_800};">{paid_at}</td></tr>
      </table>
      <p>Keep this email as your receipt for this payment.</p>"""
    return subject, _shell(f"Payment received — {period_label}", body, "View payment history", payments_url)


def tenant_notice_email(
    full_name: str,
    *,
    subject: str,
    message: str,
    building_name: str,
    unit_number: str,
) -> tuple[str, str]:
    first_name = full_name.split(" ")[0]
    payments_url = f"{current_app.config['FRONTEND_URL']}/dashboard/payments"
    paragraphs = "".join(
        f"<p style='margin:0 0 12px;'>{html.escape(line)}</p>"
        for line in message.splitlines()
        if line.strip()
    )
    body = f"""\
      <p>Hi {first_name},</p>
      <p style="margin:0 0 16px;color:{BROWN_600};font-size:13px;">
        Regarding Unit {html.escape(unit_number)} — {html.escape(building_name)}
      </p>
      {paragraphs}"""
    return subject, _shell(subject, body, "View your payments", payments_url)


def tenant_welcome_email(full_name: str) -> tuple[str, str]:
    first_name = full_name.split(" ")[0]
    login_url = f"{current_app.config['FRONTEND_URL']}/login"
    subject = "Welcome to Nyumba — let's link your unit"
    body = f"""\
      <p>Hi {first_name},</p>
      <p>Your tenant account is ready. Once you log in, you'll pick your building and unit
      from a quick dropdown so your landlord can start tracking your tenancy.</p>
      <p style="margin:20px 0 8px;font-weight:700;color:{BROWN_800};">What's next:</p>
      <ul style="margin:0;padding-left:20px;">
        <li>Log in with your phone number and password</li>
        <li>Search for your building by name</li>
        <li>Pick your unit from the list</li>
      </ul>"""
    return subject, _shell("Welcome to Nyumba", body, "Go to your dashboard", login_url)


def maintenance_update_email(
    full_name: str,
    *,
    event: str,
    ticket_title: str,
    building_name: str,
    unit_number: str,
    detail: str,
) -> tuple[str, str]:
    """Branded notification shared by tenants and landlords for ticket events."""
    first_name = html.escape(full_name.split(" ")[0])
    dashboard_url = f"{current_app.config['FRONTEND_URL']}/dashboard/tickets"
    subject = f"{event} — {ticket_title}"
    body = f"""\
      <p>Hi {first_name},</p>
      <p style="margin:0 0 16px;color:{BROWN_600};font-size:13px;">
        Unit {html.escape(unit_number)} · {html.escape(building_name)}
      </p>
      <p>{html.escape(detail)}</p>
      <div style="margin:20px 0;padding:14px 16px;border-left:4px solid {ACCENT};background:{CREAM_50};">
        <strong style="color:{BROWN_800};">{html.escape(ticket_title)}</strong>
      </div>"""
    return subject, _shell(event, body, "Open maintenance request", dashboard_url)
