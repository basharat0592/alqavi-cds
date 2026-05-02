import os
import sys
import django

# Add the current directory to sys.path to find modules
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    try:
        cursor.execute("ALTER TABLE sales_order MODIFY user_id char(32) DEFAULT NULL;")
        print("Successfully made user_id nullable in DB.")
    except Exception as e:
        print(f"Failed to modify table: {e}")
        try:
             # Try variant for UUID base field
             cursor.execute("ALTER TABLE sales_order MODIFY user_id varchar(255) DEFAULT NULL;")
             print("Successfully made user_id nullable using varchar fallback.")
        except Exception as e2:
             print(f"Fallback failure: {e2}")
