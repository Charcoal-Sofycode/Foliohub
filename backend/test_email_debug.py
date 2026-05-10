
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText

from email.utils import parseaddr
load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", f"FolioHub <{SMTP_USER}>")
_, SENDER_EMAIL = parseaddr(EMAIL_FROM)

def test_email():
    print(f"Connecting to {SMTP_HOST}:{SMTP_PORT}...")
    print(f"User: {SMTP_USER}")
    print(f"From: {EMAIL_FROM}")
    
    msg = MIMEText("Test email from Foliohub setup using Resend.")
    msg["Subject"] = "FolioHub Setup Test"
    msg["From"] = EMAIL_FROM
    msg["To"] = "chethanac488@gmail.com"
    
    try:
        if SMTP_PORT == 465:
            print("Using SSL (Port 465)")
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
        else:
            print("Using STARTTLS (Port 587)")
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()

        with server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, ["chethanac488@gmail.com"], msg.as_string())
        print(f"\n✅ Success! Email sent to chethanac488@gmail.com.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        if "Authentication failed" in str(e):
            print("Tip: Double check your Resend API Key in .env")
        elif "Connection refused" in str(e):
            print("Tip: Check your firewall or if the port is correct (465 vs 587)")

if __name__ == "__main__":
    test_email()
