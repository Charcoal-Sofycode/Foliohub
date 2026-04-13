from sqlalchemy import text
from database import engine

def upgrade():
    with engine.begin() as conn:
        queries = [
            'ALTER TABLE portfolios ADD COLUMN showreel_url VARCHAR;',
            'ALTER TABLE portfolios ADD COLUMN skills VARCHAR;',
            'ALTER TABLE portfolios ADD COLUMN location VARCHAR;',
            'ALTER TABLE portfolios ADD COLUMN availability VARCHAR;',
            'ALTER TABLE portfolios ADD COLUMN fixed_packages TEXT;',
            'ALTER TABLE portfolios ADD COLUMN hourly_rate VARCHAR;',
            'ALTER TABLE portfolios ADD COLUMN booking_link VARCHAR;',
            'ALTER TABLE projects ADD COLUMN role VARCHAR;',
            'ALTER TABLE projects ADD COLUMN tools_used VARCHAR;',
            "ALTER TABLE projects ADD COLUMN category VARCHAR DEFAULT 'general';"
        ]
        for q in queries:
            try:
                conn.execute(text(q))
                print('Executed:', q)
            except Exception as e:
                print('Failed:', q, e)

if __name__ == '__main__':
    upgrade()
