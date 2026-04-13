from sqlalchemy import text
from database import engine

def upgrade():
    with engine.begin() as conn:
        queries = [
            'ALTER TABLE projects ADD COLUMN raw_media_url VARCHAR;'
        ]
        for q in queries:
            try:
                conn.execute(text(q))
                print('Executed:', q)
            except Exception as e:
                print('Failed:', q, e)

if __name__ == '__main__':
    upgrade()
