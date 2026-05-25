import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN social_proof_headline VARCHAR'))
    except Exception as e:
        print("social_proof_headline error:", e)
        
    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN brands_worked_with VARCHAR'))
    except Exception as e:
        print("brands_worked_with error:", e)
        
    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN platform_rating VARCHAR'))
    except Exception as e:
        print("platform_rating error:", e)

print("Done")
