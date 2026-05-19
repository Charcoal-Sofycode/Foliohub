import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

with engine.begin() as conn:
    try:
        conn.execute(text('ALTER TABLE projects ADD COLUMN metric_views VARCHAR'))
    except Exception as e:
        print("metric_views error:", e)
        
    try:
        conn.execute(text('ALTER TABLE projects ADD COLUMN metric_retention VARCHAR'))
    except Exception as e:
        print("metric_retention error:", e)
        
    try:
        conn.execute(text('ALTER TABLE projects ADD COLUMN metric_ctr VARCHAR'))
    except Exception as e:
        print("metric_ctr error:", e)
        
    try:
        conn.execute(text('ALTER TABLE projects ADD COLUMN metric_watch_time VARCHAR'))
    except Exception as e:
        print("metric_watch_time error:", e)

print("Done")
