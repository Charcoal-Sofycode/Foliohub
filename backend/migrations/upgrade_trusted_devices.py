import os
import sys
from dotenv import load_dotenv

# Ensure we can import from backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import models
from database import engine

print("Starting database schema migration for trusted_devices...")

try:
    # metadata.create_all will automatically create the new table "trusted_devices" 
    # along with any defined primary keys and indexes.
    models.Base.metadata.create_all(bind=engine)
    print("Database migration successful: 'trusted_devices' table is provisioned and ready.")
except Exception as e:
    print(f"Error provisioning table: {e}")
    sys.exit(1)
