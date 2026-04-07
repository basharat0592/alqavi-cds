import os
import django
import sys
import traceback

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.products.models import MainCategory
from modules.products.serializers import MainCategorySerializer
from rest_framework.test import APIRequestFactory
from django.contrib.auth.models import AnonymousUser
from modules.users.models import User

def run_test():
    factory = APIRequestFactory()
    request = factory.get('/')
    
    # Test combinations
    users = [
        ('Anonymous', AnonymousUser()),
        ('Admin', User.objects.filter(is_superuser=True).first()),
        ('Staff', User.objects.filter(is_staff=True, is_superuser=False).first()),
    ]
    
    for name, user in users:
        print(f"\n--- Testing with user: {name} ({user}) ---")
        if user is None:
            print("User type not found, skipping.")
            continue
            
        request.user = user
        try:
            cats = MainCategory.objects.all()
            serializer = MainCategorySerializer(cats, many=True, context={'request': request})
            data = serializer.data
            print(f"Success! Found {len(data)} categories.")
        except Exception:
            print(f"FAILED with user {name}:")
            traceback.print_exc()

if __name__ == "__main__":
    run_test()
