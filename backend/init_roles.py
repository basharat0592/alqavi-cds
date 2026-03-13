import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.users.models import Role

roles_data = [
    {"name": "Super Admin", "description": "Full system access including all settings, users, and financials.", "is_default": True},
    {"name": "Admin", "description": "Manage day-to-day operations, products, and standard users.", "is_default": True},
    {"name": "Manager", "description": "Manage sales, inventory, and staff.", "is_default": False},
    {"name": "Sales Rep", "description": "Process orders and view basic products.", "is_default": False},
    {"name": "Inventory Staff", "description": "Manage warehouses, stock adjustments, and batches.", "is_default": False},
]

for item in roles_data:
    role, created = Role.objects.get_or_create(
        name=item["name"],
        defaults={"description": item["description"], "is_default": item["is_default"]}
    )
    if created:
        print(f"Created role: {role.name}")
    else:
        print(f"Role already exists: {role.name}")

print("Role initialization complete.")
