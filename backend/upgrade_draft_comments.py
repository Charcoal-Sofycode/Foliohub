import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE project_comments ADD COLUMN is_draft BOOLEAN DEFAULT TRUE'))
        print("Successfully added column: is_draft to project_comments")
    except Exception as e:
        print(f"Column 'is_draft' check/error (likely already exists): {e}")

print("Database upgrade check completed.")
