from sqlalchemy import text
from database import engine

def upgrade():
    with engine.begin() as conn:
        queries = [
            'ALTER TABLE projects ADD COLUMN timeline_breakdown TEXT;',
            'ALTER TABLE projects ADD COLUMN project_file_url VARCHAR;',
            "ALTER TABLE projects ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;"
        ]
        for q in queries:
            try:
                conn.execute(text(q))
                print('Executed:', q)
            except Exception as e:
                print('Failed:', q, e)

if __name__ == '__main__':
    upgrade()
