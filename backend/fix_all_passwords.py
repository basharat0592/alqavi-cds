import os
import django
import sys

# Set up Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.users.models import User

def fix_passwords():
    users = User.objects.all()
    print(f"Fixing passwords for {users.count()} users...")
    for u in users:
        u.set_password('admin123')
        u.plain_password = 'admin123'
        u.is_active = True
        u.status = 'active'
        u.save()
        print(f"User: {u.username} set to admin123")

if __name__ == "__main__":
    fix_passwords()
