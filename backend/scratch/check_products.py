import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.products.models import Product

def check_products():
    prods = Product.objects.all()
    print(f"Total Products: {prods.count()}")
    for p in prods[:10]:
        print(f"ID: {p.id} | Name: {p.product_name} | Status: {p.status} | Qty: {p.total_quantity} | Price: {p.selling_price}")

if __name__ == "__main__":
    check_products()
