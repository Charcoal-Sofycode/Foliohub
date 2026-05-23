import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.begin() as conn:
    fields = [
        ("max_recorrections", "INTEGER DEFAULT 3"),
        ("recorrections_used", "INTEGER DEFAULT 0")
    ]
    for field, dtype in fields:
        try:
            conn.execute(text(f'ALTER TABLE projects ADD COLUMN {field} {dtype}'))
            print(f"Successfully added column: {field}")
        except Exception as e:
            print(f"Column '{field}' check/error (likely already exists): {e}")

print("Database upgrade check completed.")
