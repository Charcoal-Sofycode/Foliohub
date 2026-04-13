import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

project_id = "xfmodolbtnmhzukbnahw"
password = "Supabasesaas%402026"
host = "aws-0-eu-north-1.pooler.supabase.com"

tests = [
    (f"postgresql://postgres.{project_id}:{password}@{host}:6543/postgres", "Username with ref, Port 6543"),
    (f"postgresql://postgres.{project_id}:{password}@{host}:5432/postgres", "Username with ref, Port 5432"),
    (f"postgresql://postgres:{password}@{host}:6543/postgres", "Username alone, Port 6543"),
    (f"postgresql://postgres:{password}@{host}:5432/postgres", "Username alone, Port 5432"),
]

for url, desc in tests:
    print(f"Testing: {desc}...")
    try:
        engine = create_engine(url, connect_args={'connect_timeout': 5})
        conn = engine.connect()
        print(f"Success! Worked with {desc}")
        conn.close()
        break
    except Exception as e:
        print(f"Failed: {str(e)[:100]}")
else:
    print("All pooler variants failed.")
