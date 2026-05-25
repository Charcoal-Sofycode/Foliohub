import json
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
from audio_analyzer import generate_automatic_audio_proof

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def analyze_all():
    with engine.connect() as conn:
        # Get all projects
        result = conn.execute(text("SELECT id, title, description FROM projects WHERE project_type = 'video'"))
        projects = result.fetchall()
        
        print(f"Found {len(projects)} video projects. Starting automatic audio analysis...")
        
        for p in projects:
            p_id, title, desc = p
            print(f"Analyzing: {title} (ID: {p_id})...")
            
            # Generate simulated AI proof
            proof = generate_automatic_audio_proof(title, desc)
            
            # Update DB
            query = text("UPDATE projects SET audio_proof = :data WHERE id = :p_id")
            conn.execute(query, {"data": json.dumps(proof), "p_id": p_id})
            
        conn.commit()
        print("Done. All projects now have automatic audio proofing data.")

if __name__ == "__main__":
    analyze_all()
