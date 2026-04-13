import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

project_id = "xfmodolbtnmhzukbnahw"
password = "Supabasesaas%402026"
host = "aws-0-ap-south-1.pooler.supabase.com"
url = f"postgresql://postgres.{project_id}:{password}@{host}:6543/postgres"

print(f"Testing ap-south-1...")
try:
    engine = create_engine(url)
    conn = engine.connect()
    print(f"Success! Project is in ap-south-1")
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
