import re
import smtplib
import threading
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import current_app


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", "", html).strip()


def send_email(host, port, user, password, sender, to: str, subject: str, html_body: str, attachment=None) -> None:
    """Synchronous SMTP send. Logs and swallows failures — email is a side effect of
    signup, never a reason to fail it. `attachment`, if given, is a
    (filename, bytes, subtype) tuple, e.g. ("receipt.pdf", data, "pdf")."""
    try:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to

        alt = MIMEMultipart("alternative")
        alt.attach(MIMEText(_strip_html(html_body), "plain"))
        alt.attach(MIMEText(html_body, "html"))
        msg.attach(alt)

        if attachment:
            filename, data, subtype = attachment
            part = MIMEApplication(data, _subtype=subtype)
            part.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(part)

        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(sender, [to], msg.as_string())
    except Exception:
        import logging

        logging.getLogger(__name__).exception("Failed to send email to %s", to)


def send_email_async(to: str, subject: str, html_body: str, attachment=None) -> None:
    """Fires off `send_email` on a background thread using the app's SMTP config, so
    a slow/unreachable mail server never delays the HTTP response. No-ops quietly if
    SMTP isn't configured (e.g. local dev without credentials)."""
    app = current_app._get_current_object()
    host = app.config.get("SMTP_HOST")
    user = app.config.get("SMTP_USER")
    password = app.config.get("SMTP_PASSWORD")
    sender = app.config.get("EMAIL_FROM") or user
    port = app.config.get("SMTP_PORT", 587)

    if not host or not user or not password:
        app.logger.warning("SMTP not configured; skipping email to %s", to)
        return

    thread = threading.Thread(
        target=send_email,
        args=(host, port, user, password, sender, to, subject, html_body, attachment),
        daemon=True,
    )
    thread.start()
