import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/portfolio_saas")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

print(f"Connecting to database...")

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN revision_policy TEXT'))
        print("Success: added 'revision_policy' to 'portfolios'")
    except Exception as e:
        print("Error/Info 'revision_policy':", e)

    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN agreement_url VARCHAR'))
        print("Success: added 'agreement_url' to 'portfolios'")
    except Exception as e:
        print("Error/Info 'agreement_url':", e)

print("Migration completed.")
