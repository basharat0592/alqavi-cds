import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from modules.inventory.serializers import WarehouseSerializer, ProductBatchSerializer, InventoryBatchStockSerializer

wh_data = {'name': 'Test', 'location': 'Loc', 'is_default': False}
s = WarehouseSerializer(data=wh_data)
print('Warehouse valid:', s.is_valid())
if not s.is_valid():
    print(s.errors)

batch_data = {'product': 1, 'batch_number': '123'}
b = ProductBatchSerializer(data=batch_data)
print('Batch valid:', b.is_valid())
if not b.is_valid():
    print(b.errors)
