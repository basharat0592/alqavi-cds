import os
import django
import sys

# Set up Django environment
sys.path.append('c:\\Users\\Dell\\OneDrive\\Documents\\cosmetic-distributor-system\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.users.models import User

def check_users():
    users = User.objects.all()
    print(f"Total Users: {users.count()}")
    for u in users:
        print(f"User: {u.username} | Email: {u.email} | Password: {u.plain_password} | Active: {u.is_active} | Staff: {u.is_staff} | Super: {u.is_superuser}")

if __name__ == "__main__":
    check_users()
