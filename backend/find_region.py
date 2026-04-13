import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

regions = ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-central-1", "eu-west-1", "ap-southeast-1"]
project_id = "xfmodolbtnmhzukbnahw"
password = "Supabasesaas%402026"

for region in regions:
    host = f"aws-0-{region}.pooler.supabase.com"
    # Try transaction mode port 6543
    url = f"postgresql://postgres.{project_id}:{password}@{host}:6543/postgres"
    print(f"Testing {region}...")
    try:
        engine = create_engine(url, connect_args={'connect_timeout': 5})
        conn = engine.connect()
        print(f"Success! Project is in {region}")
        conn.close()
        break
    except Exception as e:
        if "Tenant or user not found" in str(e):
            print(f"{region}: Tenant not found.")
        elif "timeout" in str(e).lower():
            print(f"{region}: Timeout.")
        else:
            print(f"{region}: {e}")
else:
    print("Could not find the correct region.")
