import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/portfolio_saas")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

print(f"Connecting to database...")

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE project_comments ADD COLUMN is_resolved BOOLEAN DEFAULT FALSE'))
        print("Success: added 'is_resolved' column to 'project_comments' table.")
    except Exception as e:
        if "already exists" in str(e).lower():
            print("Info: Column 'is_resolved' already exists. Skipping.")
        else:
            print(f"Error adding column: {str(e)}")

print("Migration script completed.")
