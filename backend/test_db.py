import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Connecting to: {DATABASE_URL.split('@')[1]}")

try:
    # Using the IPv6 address resolved earlier
    ipv6_url = "postgresql://postgres:Supabasesaas%402026@[2406:da18:243:7403:eca7:877b:e19c:c425]:5432/postgres"
    print(f"Connecting to IPv6 address...")
    engine = create_engine(ipv6_url)
    connection = engine.connect()
    print("Successfully connected to the database!")
    connection.close()
except Exception as e:
    print(f"Connection failed: {e}")
