import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from modules.users.models import UserActivityLog

logs = UserActivityLog.objects.all()[:10]
for l in logs:
    print(f"ID: {l.id}, Action: {l.action}, Desc: {l.description}, User: {l.user}, Read: {l.is_read}")
