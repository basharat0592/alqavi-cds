import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from modules.inventory.models import Warehouse, Stock

gilgit = Warehouse.objects.filter(name__icontains='Gilgit').first()
if gilgit:
    print(f"Warehouse: {gilgit.name} (ID: {gilgit.id})")
    stocks = Stock.objects.filter(warehouse=gilgit)
    print(f"Total Stock Entries: {stocks.count()}")
    unique_names = stocks.values_list('product_name', flat=True).distinct()
    print(f"Unique Product Names: {list(unique_names)} (Count: {len(unique_names)})")
    for s in stocks:
        print(f"- {s.product_name}: {s.total_quantity} units (Price: {s.price_per_item})")
else:
    print("Gilgit warehouse not found")
