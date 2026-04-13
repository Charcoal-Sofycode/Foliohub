from sqlalchemy import text
from database import engine

def upgrade_users_table():
    with engine.begin() as conn:
        try:
            # Add reset_token
            conn.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR;"))
            print("Added reset_token column.")
        except Exception as e:
            print(f"reset_token column might already exist or error: {e}")
            
        try:
            # Add is_2fa_enabled
            conn.execute(text("ALTER TABLE users ADD COLUMN is_2fa_enabled BOOLEAN DEFAULT FALSE;"))
            print("Added is_2fa_enabled column.")
        except Exception as e:
            print(f"is_2fa_enabled column might already exist or error: {e}")

        try:
            # Add two_factor_code
            conn.execute(text("ALTER TABLE users ADD COLUMN two_factor_code VARCHAR;"))
            print("Added two_factor_code column.")
        except Exception as e:
            print(f"two_factor_code column might already exist or error: {e}")

if __name__ == "__main__":
    upgrade_users_table()
    print("Database schema upgrade complete.")
