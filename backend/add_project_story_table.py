"""
add_project_story_table.py
--------------------------
Creates the project_stories table in Supabase.
Run once from the backend/ directory with venv active:
    python add_project_story_table.py
"""
from database import engine
from sqlalchemy import text

DDL = """
CREATE TABLE IF NOT EXISTS project_stories (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    brief_note      TEXT,
    brief_media     JSONB DEFAULT '[]'::jsonb,
    storyboard_note TEXT,
    storyboard_media JSONB DEFAULT '[]'::jsonb,
    rough_cut_note  TEXT,
    rough_cut_media JSONB DEFAULT '[]'::jsonb,
    revisions_note  TEXT,
    revisions_data  JSONB DEFAULT '[]'::jsonb,
    final_note      TEXT,
    final_media     JSONB DEFAULT '[]'::jsonb,
    updated_at      TIMESTAMP
);
"""

def main():
    with engine.connect() as conn:
        conn.execute(text(DDL))
        conn.commit()
    print("project_stories table created (or already exists).")

if __name__ == "__main__":
    main()
