from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def upgrade():
    with engine.connect() as conn:
        print("Adding audio_proof column to projects table...")
        try:
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS audio_proof JSON;"))
            conn.commit()
            print("Successfully added audio_proof column.")
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    upgrade()
