import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.products.models import Product

def check_product_categories():
    prods = Product.objects.all()
    for p in prods:
        print(f"Name: {p.product_name} | Category: {p.category.name if p.category else 'None'} | Status: {p.status}")

if __name__ == "__main__":
    check_product_categories()
