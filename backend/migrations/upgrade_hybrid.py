import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.begin() as conn:
    fields = [
        ("metric_likes", "VARCHAR"),
        ("metric_comments", "VARCHAR"),
        ("source_link", "VARCHAR"),
        ("client_goals", "TEXT"),
        ("strategy_notes", "TEXT"),
        ("monetization_results", "TEXT")
    ]
    for field, dtype in fields:
        try:
            conn.execute(text(f'ALTER TABLE projects ADD COLUMN {field} {dtype}'))
            print(f"Added {field}")
        except Exception as e:
            print(f"{field} error: {e}")

print("Done")
