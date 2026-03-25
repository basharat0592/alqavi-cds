import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

try:
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST', '127.0.0.1'),
        user=os.getenv('MYSQL_USER', 'root'),
        password=os.getenv('MYSQL_PASSWORD', ''),
        database=os.getenv('MYSQL_DATABASE', 'al_qavidb'),
        port=os.getenv('DB_PORT', '3306')
    )
    print("MySQL connected successfully")
    conn.close()
except Exception as e:
    print(f"MySQL connection failed: {e}")
