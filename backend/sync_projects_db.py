import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

def sync_projects_table():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not found in environment.")
        return

    engine = create_engine(DATABASE_URL)
    
    # Columns to add to the 'projects' table
    new_columns = [
        ("optimized_url", "VARCHAR"),
        ("transcoding_status", "VARCHAR DEFAULT 'pending'")
    ]

    print("--- Project Database Sync Initiated ---")
    
    try:
        with engine.connect() as conn:
            # Check existing columns
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'"))
            existing_columns = [row[0] for row in result]
            
            for col_name, col_type in new_columns:
                if col_name not in existing_columns:
                    print(f"Adding column: {col_name}...")
                    conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"SUCCESS: Added {col_name}.")
                else:
                    print(f"Column {col_name} already exists. Skipping.")

            print("--- Sync Complete. Projects table is now Pro-Video ready. ---")
            
    except Exception as e:
        print(f"ERROR during sync: {e}")

if __name__ == "__main__":
    sync_projects_table()
