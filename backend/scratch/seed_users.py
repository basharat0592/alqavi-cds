import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from modules.users.models import Role, Permission

User = get_user_model()

print("=== Seeding Roles, Permissions, and Admin User ===")

# Create or get permissions
permissions_data = [
    ('users', 'Manage Users', 'manage_users'),
    ('products', 'Manage Products', 'manage_products'),
    ('orders', 'Manage Orders', 'manage_orders'),
    ('inventory', 'Manage Inventory', 'manage_inventory'),
    ('settings', 'Manage Settings', 'manage_settings'),
    ('roles', 'Manage Roles', 'manage_roles'),
]

created_perms = []
for cat, name, code in permissions_data:
    perm, created = Permission.objects.get_or_create(
        code=code,
        defaults={'name': name, 'category': cat, 'description': f'Allows to {name.lower()}'}
    )
    created_perms.append(perm)
    if created:
        print(f"Created Permission: {name}")

# Create or get roles
admin_role, created = Role.objects.get_or_create(
    name="Admin",
    defaults={'description': 'System Administrator with full access', 'is_default': False}
)
if created:
    print("Created Admin Role")
admin_role.permissions.set(created_perms)

supplier_role, created = Role.objects.get_or_create(
    name="Supplier",
    defaults={'description': 'Supplier role for managing supplier inventory and sales', 'is_default': False}
)
if created:
    print("Created Supplier Role")

customer_role, created = Role.objects.get_or_create(
    name="Customer",
    defaults={'description': 'Customer role for placing orders and tracking', 'is_default': True}
)
if created:
    print("Created Customer Role")

# Create Admin User
admin_username = "admin"
admin_email = "admin@alqavihub.com"
admin_password = "adminpassword"

if not User.objects.filter(username=admin_username).exists():
    admin_user = User.objects.create_superuser(
        username=admin_username,
        email=admin_email,
        password=admin_password,
        role=admin_role,
        plain_password=admin_password
    )
    print(f"Successfully created superuser '{admin_username}' with password '{admin_password}'!")
else:
    print(f"Superuser '{admin_username}' already exists.")

print("=== User seeding complete! ===")
