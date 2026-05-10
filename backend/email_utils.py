
import os
import requests
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# We use the same environment variables, but interpret SMTP_PASSWORD as the Resend API Key
RESEND_API_KEY = os.getenv("SMTP_PASSWORD", "").strip()
EMAIL_FROM = os.getenv("EMAIL_FROM", "FolioHub <noreply@sofycode.com>").strip('"')

def send_resend_api_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """
    Sends an email using the Resend HTTP API.
    Bypasses SMTP port restrictions on cloud hosting.
    """
    if not RESEND_API_KEY:
        logger.warning(f"[DEV] RESEND_API_KEY not configured. Email to {to_email}: {subject}")
        print(f"\n{'='*50}\n  API MOCK: Email to {to_email}\n  Subject: {subject}\n{'='*50}\n")
        return True

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "from": EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    if text_content:
        payload["text"] = text_content

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code in [200, 201]:
            logger.info(f"Email successfully sent via Resend API to {to_email}")
            with open("otp_debug.log", "a") as f:
                f.write(f"[{datetime.now().isoformat()}] SUCCESS: API Email sent to {to_email}\n")
            return True
        else:
            logger.error(f"Resend API Error ({response.status_code}): {response.text}")
            with open("otp_debug.log", "a") as f:
                f.write(f"[{datetime.now().isoformat()}] API ERROR: {response.status_code} - {response.text}\n")
            return False
    except Exception as e:
        logger.error(f"Failed to connect to Resend API: {e}")
        return False

def send_otp_email(to_email: str, otp: str) -> bool:
    subject = "FolioHub — Your Account Recovery Code"
    html_body = f"""
    <div style="font-family:sans-serif;background:#050505;color:white;padding:40px;border-radius:12px;">
        <h2 style="color:white;">Account Recovery</h2>
        <p style="color:#71717a;">Use the code below to reset your password. Valid for 10 minutes.</p>
        <div style="background:#18181b;padding:24px;text-align:center;font-size:40px;font-weight:bold;letter-spacing:10px;">{otp}</div>
    </div>
    """
    return send_resend_api_email(to_email, subject, html_body, f"Your recovery code is: {otp}")

def send_2fa_email(to_email: str, otp: str) -> bool:
    # Persistent Debug Log for OTPs
    with open("otp_debug.log", "a") as f:
        f.write(f"[{datetime.now().isoformat()}] 2FA OTP for {to_email}: {otp}\n")

    subject = f"FolioHub — {otp} is your verification code"
    html_body = f"""
    <div style="font-family:sans-serif;background:#050505;color:white;padding:40px;border-radius:12px;border:1px solid #27272a;">
        <p style="font-weight:bold;font-size:18px;">FolioHub Authentication</p>
        <h1 style="margin-top:0;">Secure Login Code</h1>
        <p style="color:#71717a;">Use the verification code below to complete your login.</p>
        <div style="background:#18181b;padding:24px;text-align:center;font-size:48px;font-weight:bold;letter-spacing:10px;border:1px solid #3f3f46;border-radius:8px;">{otp}</div>
        <p style="font-size:12px;color:#52525b;margin-top:20px;">If you did not attempt to sign in, please secure your account.</p>
    </div>
    """
    return send_resend_api_email(to_email, subject, html_body, f"Your login code is: {otp}")

def send_email(to_email: str, subject: str, body: str) -> bool:
    return send_resend_api_email(to_email, subject, f"<p>{body}</p>", body)
