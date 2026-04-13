from sqlalchemy import text
from database import engine

def upgrade():
    with engine.begin() as conn:
        queries = [
            'ALTER TABLE portfolios ADD COLUMN skill_cutting INTEGER DEFAULT 0;',
            'ALTER TABLE portfolios ADD COLUMN skill_motion INTEGER DEFAULT 0;',
            'ALTER TABLE portfolios ADD COLUMN skill_color INTEGER DEFAULT 0;'
        ]
        for q in queries:
            try:
                conn.execute(text(q))
                print('Executed:', q)
            except Exception as e:
                print('Failed:', q, e)

if __name__ == '__main__':
    upgrade()
