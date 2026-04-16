import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    sys.exit(1)

# Connect to the database
engine = create_engine(DATABASE_URL)

def sync_db():
    print("SYNC: Synchronizing Inquiry table...")
    
    with engine.connect() as conn:
        # 1. Create the inquiries table if it doesn't exist
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS inquiries (
                id SERIAL PRIMARY KEY,
                portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
                name VARCHAR NOT NULL,
                email VARCHAR NOT NULL,
                details TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        conn.commit()

    # 2. Individually check and add missing columns
    columns_to_check = [
        ("details", "TEXT NOT NULL DEFAULT ''"),
        ("is_read", "BOOLEAN DEFAULT FALSE"),
        ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
    ]

    for col_name, col_def in columns_to_check:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"SELECT {col_name} FROM inquiries LIMIT 1"))
        except Exception:
            print(f"WARNING: '{col_name}' column missing. Adding it now...")
            try:
                with engine.connect() as conn:
                    conn.execute(text(f"ALTER TABLE inquiries ADD COLUMN {col_name} {col_def};"))
                    conn.commit()
            except Exception as e:
                print(f"ERROR: Failed to add column {col_name}: {e}")

    print("SUCCESS: Database sync complete.")

if __name__ == "__main__":
    try:
        sync_db()
    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
