import os
import sys
import django
import json

# Add backend directory to sys.path
backend_dir = r"c:\alqavi cds\backend"
sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from modules.cms.models import WebsiteSection

sections = WebsiteSection.objects.filter(section_type='hero')
print(f"Found {sections.count()} hero sections.")
for s in sections:
    print(f"ID: {s.id}, Name: {s.name}, Visible: {s.is_visible}")
    print(json.dumps(s.content, indent=2))
