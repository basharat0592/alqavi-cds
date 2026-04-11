import os, django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from rest_framework.test import APIClient
from modules.users.models import User

client = APIClient()

# Try with superuser
user = User.objects.filter(is_superuser=True).first()
if user:
    client.force_authenticate(user=user)
    print(f"Authenticated as superuser: {user.username}")
else:
    print("No superuser found.")

print("Testing /api/v1/products/items/...")
try:
    response = client.get('/api/v1/products/items/')
    print(f"Status Code: {response.status_code}")
    if response.status_code == 500:
        print("Error Response:")
        print(response.data)
    else:
        print("Success!")
        # print(response.data)
except Exception as e:
    print(f"Client call failed: {e}")
    traceback.print_exc()
