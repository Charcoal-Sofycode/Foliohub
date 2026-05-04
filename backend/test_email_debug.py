
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", f"FolioHub <{SMTP_USER}>")

def test_email():
    print(f"Connecting to {SMTP_HOST}:{SMTP_PORT}...")
    print(f"User: {SMTP_USER}")
    print(f"From: {EMAIL_FROM}")
    
    msg = MIMEText("Test email from Foliohub setup.")
    msg["Subject"] = "Test Email"
    msg["From"] = EMAIL_FROM
    msg["To"] = SMTP_USER # Send to self for test
    
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, [SMTP_USER], msg.as_string())
        print("Success! Email sent.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_email()
