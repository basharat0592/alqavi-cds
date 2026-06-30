import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.cms.models import WebsiteSection

print("Current sections:")
for s in WebsiteSection.objects.all():
    print(f"ID: {s.id}, Name: {s.name}, Type: {s.section_type}")

try:
    dummy = WebsiteSection.objects.create(name="Dummy Section", section_type="about")
    print(f"Created dummy section with ID {dummy.id}")
    dummy.delete()
    print("Successfully deleted dummy section using Django ORM")
except Exception as e:
    print(f"Error trying to delete: {e}")
