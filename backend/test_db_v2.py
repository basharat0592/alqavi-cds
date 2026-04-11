import MySQLdb
import os
from dotenv import load_dotenv

load_dotenv()

host = os.getenv('DB_HOST', '127.0.0.1')
user = os.getenv('MYSQL_USER', 'root')
password = os.getenv('MYSQL_PASSWORD', '')
database = os.getenv('MYSQL_DATABASE', 'qavidb')
port = int(os.getenv('DB_PORT', '3306'))

print(f"Connecting to {host}:{port} as {user}...")
try:
    conn = MySQLdb.connect(
        host=host,
        user=user,
        passwd=password,
        db=database,
        port=port,
        connect_timeout=5
    )
    print("MySQL connected successfully")
    conn.close()
except Exception as e:
    print(f"MySQL connection failed: {e}")
