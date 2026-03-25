import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.products.models import Product, Category

# Ensure category exists
cat, _ = Category.objects.get_or_create(name="Best Sellers", defaults={'description': 'Popular items'})

products_to_add = [
    {"name": "Hydra Glow Serum", "price": 2850, "sku": "SER-HG-001", "quantity": 15},
    {"name": "Matte Finish Foundation", "price": 3200, "sku": "FOU-MF-001", "quantity": 10},
    {"name": "Ultra Balm Lipstick", "price": 1250, "sku": "LIP-UB-001", "quantity": 25},
]

for p_data in products_to_add:
    if not Product.objects.filter(name=p_data['name']).exists():
        Product.objects.create(
            name=p_data['name'],
            price=p_data['price'],
            sku=p_data['sku'],
            quantity_in_stock=p_data['quantity'],
            category=cat,
            status='active'
        )
        print(f"Added product: {p_data['name']}")
    else:
        print(f"Product already exists: {p_data['name']}")

print("Done.")
