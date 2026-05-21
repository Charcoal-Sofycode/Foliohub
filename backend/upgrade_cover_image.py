import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE portfolios ADD COLUMN cover_image_url VARCHAR'))
        print("Successfully added cover_image_url column to portfolios table.")
    except Exception as e:
        print("cover_image_url error:", e)

print("Done")
