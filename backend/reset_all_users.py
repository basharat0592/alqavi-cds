import os
import django
import sys

# Set up Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.users.models import User, Role

def reset_all():
    users = User.objects.all()
    count = 0
    for u in users:
        u.set_password('admin123')
        u.plain_password = 'admin123'
        u.is_active = True
        u.status = 'active'
        u.save()
        count += 1
        print(f"User {u.username} reset to admin123 and activated.")
    
    print(f"\nTotal users reset: {count}")

if __name__ == "__main__":
    reset_all()
