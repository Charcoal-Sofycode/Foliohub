from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='users' AND column_name IN ('reset_otp', 'reset_otp_expires_at')"
    ))
    cols = [row[0] for row in result]
    print("Columns found:", cols)
    if len(cols) == 2:
        print("SUCCESS: Both OTP columns are present in the database.")
    else:
        print("WARNING: Some columns may be missing.")
