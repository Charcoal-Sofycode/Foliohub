import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN whatsapp_number VARCHAR'))
    except Exception as e:
        print("whatsapp_number error:", e)
        
    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN contact_email VARCHAR'))
    except Exception as e:
        print("contact_email error:", e)
        
    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN fiverr_url VARCHAR'))
    except Exception as e:
        print("fiverr_url error:", e)

print("Done")
