import os
import django
import sys

# Set up Django environment
sys.path.append('c:\\Users\\Dell\\OneDrive\\Documents\\cosmetic-distributor-system\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.users.models import UserActivityLog

def check_logs():
    logs = UserActivityLog.objects.order_by('-timestamp')[:10]
    print(f"Total Logs: {UserActivityLog.objects.count()}")
    for l in logs:
        print(f"Time: {l.timestamp} | User: {l.user.username if l.user else 'System'} | Action: {l.action} | Desc: {l.description}")

if __name__ == "__main__":
    check_logs()
