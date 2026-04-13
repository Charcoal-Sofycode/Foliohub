import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Connecting to: {DATABASE_URL.split('@')[1]}")

try:
    engine = create_engine(DATABASE_URL)
    connection = engine.connect()
    print("Success! The database is connected.")
    connection.close()
except Exception as e:
    print(f"Connection failed: {e}")
