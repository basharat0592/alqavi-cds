from modules.users.models import User, Role
from django.contrib.auth.hashers import make_password

# Create Roles
admin_role, _ = Role.objects.get_or_create(name='admin', defaults={'description': 'System Administrator'})
seller_role, _ = Role.objects.get_or_create(name='seller', defaults={'description': 'Product Seller'})
customer_role, _ = Role.objects.get_or_create(name='customer', defaults={'description': 'Regular Customer'})

print("Roles ensured.")

# Ensure Admin User
username = 'admin'
email = 'admin@alqavi.com'
password = 'admin12'

user = User.objects.filter(username=username).first()
if user:
    user.email = email
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.role = admin_role
    user.set_password(password)
    user.save()
    print(f"User {username} updated with admin role.")
else:
    User.objects.create(
        username=username,
        email=email,
        password=make_password(password),
        is_staff=True,
        is_superuser=True,
        is_active=True,
        role=admin_role
    )
    print(f"User {username} created with admin role.")
