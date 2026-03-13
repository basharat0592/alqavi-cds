import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from modules.inventory.models import StockTransfer

transfers = StockTransfer.objects.all()
print(f"Total Transfers: {transfers.count()}")
for t in transfers:
    print(f"ID: {t.id}, Product: {t.product.name}, From: {t.from_warehouse.name}, To: {t.to_warehouse.name}, Qty: {t.quantity}, Status: {t.status}")
