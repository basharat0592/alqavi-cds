import os
import sys
import django

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.products.models import SupplierProduct
from modules.sales.models import PurchaseOrder
from modules.inventory.models import Stock

print(f"Total SupplierProducts: {SupplierProduct.objects.count()}")
print(f"Total PurchaseOrders: {PurchaseOrder.objects.count()}")
print(f"Total Stocks: {Stock.objects.count()}")

# Group by supplier
from django.db.models import Count
sp_counts = SupplierProduct.objects.values('supplier_id').annotate(total=Count('id'))
print(f"SupplierProduct counts by supplier: {list(sp_counts)}")
