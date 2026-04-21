import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

# Fix for Render/Supabase if it uses postgres:// instead of postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def add_columns():
    with engine.connect() as conn:
        print("Checking for Style Fingerprint columns...")
        
        # Check if style_fingerprint exists
        try:
            conn.execute(text("ALTER TABLE portfolios ADD COLUMN style_fingerprint JSON;"))
            print("Added column: style_fingerprint")
        except Exception as e:
            if "already exists" in str(e):
                print("Column style_fingerprint already exists.")
            else:
                print(f"Error adding style_fingerprint: {e}")

        # Check if fingerprint_computed_at exists
        try:
            conn.execute(text("ALTER TABLE portfolios ADD COLUMN fingerprint_computed_at TIMESTAMP;"))
            print("Added column: fingerprint_computed_at")
        except Exception as e:
            if "already exists" in str(e):
                print("Column fingerprint_computed_at already exists.")
            else:
                print(f"Error adding fingerprint_computed_at: {e}")
        
        conn.commit()
        print("Database sync complete.")

if __name__ == "__main__":
    add_columns()
