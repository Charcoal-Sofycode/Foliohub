from database import engine
from sqlalchemy import text

def upgrade():
    try:
        with engine.connect() as conn:
            # Add the JSON column to PostgreSQL
            conn.execute(text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS theme_config JSONB;"))
            conn.commit()
            print("Successfully added theme_config column to portfolios table in PostgreSQL.")
    except Exception as e:
        print(f"Error during PostgreSQL migration: {e}")

if __name__ == "__main__":
    upgrade()
