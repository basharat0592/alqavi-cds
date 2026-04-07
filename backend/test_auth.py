import os
import django
import sys
from django.contrib.auth import authenticate

# Set up Django environment
sys.path.append('c:\\Users\\Dell\\OneDrive\\Documents\\cosmetic-distributor-system\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

def test_auth(username, password):
    print(f"Testing auth for username: {username}")
    user = authenticate(username=username, password=password)
    if user:
        print(f"SUCCESS: Authenticated as {user.username}")
    else:
        print(f"FAILURE: Could not authenticate {username}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python test_auth.py <username> <password>")
    else:
        test_auth(sys.argv[1], sys.argv[2])
