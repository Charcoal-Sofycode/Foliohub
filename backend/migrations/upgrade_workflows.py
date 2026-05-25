import sys
import os

from sqlalchemy import text
from database import engine

def upgrade():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE portfolios ADD COLUMN view_count INTEGER DEFAULT 0"))
            print("Added view_count to portfolios")
        except Exception as e:
            print("Error adding view_count to portfolios:", e)
            
        try:
            conn.execute(text("ALTER TABLE projects ADD COLUMN tags VARCHAR"))
            print("Added tags to projects")
        except Exception as e:
            print("Error adding tags to projects:", e)

        try:
            conn.execute(text("ALTER TABLE projects ADD COLUMN status VARCHAR DEFAULT 'published'"))
            print("Added status to projects")
        except Exception as e:
            print("Error adding status to projects:", e)

        try:
            conn.execute(text("""
                CREATE TABLE project_comments (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    timestamp INTEGER,
                    text TEXT NOT NULL,
                    author_name VARCHAR NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("Created project_comments table")
        except Exception as e:
            print("Error creating project_comments table:", e)
            
        conn.commit()

if __name__ == '__main__':
    upgrade()
