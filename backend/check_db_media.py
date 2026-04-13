import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

DATABASE_URL = "postgresql://postgres.xfmodolbtnmhzukbnahw:Supabasesaas%402026@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

projects = db.query(models.Project).order_by(models.Project.id.desc()).limit(2).all()
for p in projects:
    print(f"Project ID: {p.id}, Title: {p.title}, Media URL: {p.media_url}")

import requests
try:
    if projects and projects[0].media_url:
        resp = requests.head(projects[0].media_url)
        print(f"HTTP Status for media: {resp.status_code}")
except Exception as e:
    print(e)
