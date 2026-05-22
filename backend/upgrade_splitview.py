import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"  # Fallback just in case

engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.begin() as conn:
    fields = [
        ("sync_offset_ms", "INTEGER DEFAULT 0"),
        ("audio_mode", "VARCHAR DEFAULT 'crossfade'"),
        ("raw_hidden", "BOOLEAN DEFAULT FALSE"),
        ("timeline_markers", "JSON")
    ]
    for field, dtype in fields:
        try:
            # SQLite does not support IF NOT EXISTS in ALTER TABLE directly for columns in older versions,
            # but we can try and catch the exception if it already exists.
            conn.execute(text(f'ALTER TABLE projects ADD COLUMN {field} {dtype}'))
            print(f"Successfully added column: {field}")
        except Exception as e:
            print(f"Column '{field}' check/error (likely already exists): {e}")

print("Database upgrade check completed.")
