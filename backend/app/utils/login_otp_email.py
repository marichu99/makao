from flask import current_app

from app.utils.welcome_email import BROWN_800, _shell


def login_otp_email(full_name: str, code: str, validity_minutes: int) -> tuple[str, str]:
    first_name = full_name.split(" ")[0]
    login_url = f"{current_app.config['FRONTEND_URL']}/login"
    subject = f"Your Nyumba verification code: {code}"
    body = f"""\
      <p>Hi {first_name},</p>
      <p>Enter this code to finish signing in:</p>
      <p style="text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:{BROWN_800};margin:24px 0;">
        {code}
      </p>
      <p>This code expires in {validity_minutes} minutes. If you didn't try to sign in, you can
      safely ignore this email.</p>"""
    return subject, _shell("Verify it's you", body, "Open Nyumba", login_url)
