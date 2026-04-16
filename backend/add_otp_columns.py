"""
add_otp_columns.py
------------------
Run this script once to add the OTP recovery columns to the users table.

Usage (from the backend/ directory, with venv active):
    python add_otp_columns.py
"""

from database import engine
from sqlalchemy import text

def main():
    with engine.connect() as conn:
        # Check and add reset_otp column
        try:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(6)"
            ))
            print("✓ Column reset_otp added (or already exists)")
        except Exception as e:
            print(f"  reset_otp: {e}")

        # Check and add reset_otp_expires_at column
        try:
            conn.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires_at TIMESTAMP"
            ))
            print("✓ Column reset_otp_expires_at added (or already exists)")
        except Exception as e:
            print(f"  reset_otp_expires_at: {e}")

        conn.commit()

    print("\nMigration complete.")

if __name__ == "__main__":
    main()
