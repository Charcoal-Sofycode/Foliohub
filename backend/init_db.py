# backend/init_db.py
from database import engine, Base
import models

print("Starting database initialization...")

# This command looks at all classes inheriting from 'Base' in models.py 
# and creates the corresponding tables in Supabase.
Base.metadata.create_all(bind=engine)

print("Success! Tables created in Supabase.")