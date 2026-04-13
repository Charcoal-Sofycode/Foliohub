from database import SessionLocal
from models import Project

db = SessionLocal()
projects = db.query(Project).all()
for p in projects:
    print(f"Project {p.title}: media_url={p.media_url}, raw_media_url={p.raw_media_url}")
