from modules.users.models import User
from django.contrib.auth.hashers import make_password

username = 'admin'
email = 'admin@alqavi.com'
password = 'admin12'

try:
    user = User.objects.filter(username=username).first()
    if user:
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()
        print(f"User {username} updated.")
    else:
        User.objects.create(
            username=username,
            email=email,
            password=make_password(password),
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        print(f"User {username} created.")
except Exception as e:
    print(f"Error: {e}")
