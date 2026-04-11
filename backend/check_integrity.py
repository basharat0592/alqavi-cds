import os, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.products.models import Product
from modules.inventory.models import Batch, Inventory

print("Checking data integrity...")

# Check for products with no category (should be fine as it's nullable)
products_no_cat = Product.objects.filter(category__isnull=True).count()
print(f"Products without category: {products_no_cat}")

# Check for batches with null product or warehouse
batches_invalid = Batch.objects.filter(product__isnull=True).count() + Batch.objects.filter(warehouse__isnull=True).count()
print(f"Invalid batches: {batches_invalid}")

# Check for inventory records with issues
inventory_invalid = Inventory.objects.filter(product__isnull=True).count() + Inventory.objects.filter(warehouse__isnull=True).count()
print(f"Invalid inventory records: {inventory_invalid}")

# Sample serialization
from modules.products.serializers import ProductSerializer
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()
request = factory.get('/')

for p in Product.objects.all()[:10]:
    try:
        print(f"Serializing product: {p.name} ({p.id})")
        data = ProductSerializer(p, context={'request': request}).data
        # print(data)
    except Exception as e:
        import traceback
        print(f"FAILED to serialize product {p.id}: {e}")
        traceback.print_exc()

print("Done.")
