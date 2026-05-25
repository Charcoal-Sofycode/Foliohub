import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN logo_url VARCHAR'))
    except Exception as e:
        print("logo_url error:", e)
        
    try:
        conn.execute(text("ALTER TABLE portfolios ADD COLUMN accent_color VARCHAR DEFAULT '#ffffff'"))
    except Exception as e:
        print("accent_color error:", e)
        
    try:
        conn.execute(text("ALTER TABLE portfolios ADD COLUMN typography VARCHAR DEFAULT 'sans'"))
    except Exception as e:
        print("typography error:", e)
        
    try:
        conn.execute(text("ALTER TABLE portfolios ADD COLUMN intro_style VARCHAR DEFAULT 'default'"))
    except Exception as e:
        print("intro_style error:", e)

print("Done")
