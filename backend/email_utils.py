"""
email_utils.py
--------------
Utility for sending transactional emails via SMTP (e.g. Gmail App Password,
SendGrid SMTP relay, Mailgun, etc.)

Required .env variables:
    SMTP_HOST      - e.g. smtp.gmail.com
    SMTP_PORT      - e.g. 587
    SMTP_USER      - your sender email address
    SMTP_PASSWORD  - app password / API key
    EMAIL_FROM     - display name + address, e.g. "FolioHub <no-reply@foliohub.io>"
"""

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", f"FolioHub <{SMTP_USER}>")


def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Send a 6-digit OTP recovery code to the given email address.
    Returns True on success, False on failure.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        # Development fallback: just print the OTP to console
        logger.warning(
            f"[DEV] SMTP not configured. OTP for {to_email}: {otp}"
        )
        print(f"\n{'='*50}")
        print(f"  FolioHub Password Recovery OTP")
        print(f"  Email : {to_email}")
        print(f"  OTP   : {otp}  (expires in 10 minutes)")
        print(f"{'='*50}\n")
        return True

    subject = "FolioHub — Your Account Recovery Code"

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Recovery</title>
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#0a0a0a;border:1px solid #27272a;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 24px;border-bottom:1px solid #18181b;">
              <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">
                FOLIO<span style="color:#71717a;">HUB</span>
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">
                Account Recovery
              </h1>
              <p style="margin:0 0 32px;font-size:14px;color:#71717a;line-height:1.6;">
                We received a request to reset the password for your FolioHub account.
                Use the code below to complete the recovery. This code is valid for
                <strong style="color:#a1a1aa;">10 minutes</strong>.
              </p>

              <!-- OTP Block -->
              <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;
                          padding:28px;text-align:center;margin-bottom:32px;">
                <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;
                           letter-spacing:0.2em;color:#52525b;font-weight:600;">
                  Your Recovery Code
                </p>
                <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:0.15em;
                           color:#ffffff;font-variant-numeric:tabular-nums;">
                  {otp}
                </p>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#52525b;line-height:1.6;">
                If you did not request a password reset, you can safely ignore this email.
                Your account will remain secure.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #18181b;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">
                © 2026 FolioHub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    plain_body = (
        f"Your FolioHub account recovery code is: {otp}\n\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you did not request this, please ignore this email."
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, [to_email], msg.as_string())
        logger.info(f"OTP email sent to {to_email}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send OTP email to {to_email}: {exc}")
        return False


def send_2fa_email(to_email: str, otp: str) -> bool:
    """
    Send a 6-digit 2FA login code to the given email address.
    Returns True on success, False on failure.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        # Development fallback
        logger.warning(f"[DEV] SMTP not configured. 2FA for {to_email}: {otp}")
        print(f"\n{'='*50}\n  FolioHub Two-Factor Auth 2FA\n  Email : {to_email}\n  OTP   : {otp}\n{'='*50}\n")
        return True

    subject = f"FolioHub — {otp} is your verification code"

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#050505;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="440" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #27272a;border-radius:12px;">
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 10px;font-size:18px;font-weight:900;color:#ffffff;">FolioHub Authentication</p>
              <h1 style="margin:0 0 16px;font-size:32px;font-weight:900;letter-spacing:-1px;color:#ffffff;">Secure Login Code</h1>
              <p style="margin:0 0 32px;font-size:14px;color:#71717a;line-height:1.6;">
                Use the verification code below to complete your login. This code keeps your creator studio secure.
              </p>
              <div style="background:#18181b;border:1px solid #3f3f46;border-radius:8px;padding:24px;text-align:center;margin-bottom:32px;">
                <p style="margin:0;font-size:48px;font-weight:900;letter-spacing:0.2em;color:#ffffff;">{otp}</p>
              </div>
              <p style="margin:0;font-size:12px;color:#52525b;">If you did not attempt to sign in, please secure your account immediately.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    plain_body = f"Your FolioHub login verification code is: {otp}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = EMAIL_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, [to_email], msg.as_string())
        return True
    except Exception as exc:
        logger.error(f"Failed to send 2FA email: {exc}")
        return False
