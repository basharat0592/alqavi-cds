import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from modules.users.models import User

user = User.objects.filter(is_superuser=True).first()
if not user:
    user = User.objects.first()

client = APIClient()
client.force_authenticate(user=user)

wh_resp = client.post('/api/v1/inventory/warehouses/', {'name': 'Test WH', 'location': 'Loc', 'is_default': False}, format='json')
print('WH Response:', wh_resp.status_code, wh_resp.data if hasattr(wh_resp, 'data') else wh_resp.content)

product = django.apps.apps.get_model('products', 'Product').objects.first()
if product:
    b_resp = client.post('/api/v1/inventory/batches/', {
        'product': str(product.id), 
        'batch_number': 'B-999', 
        'manufacturing_date': None, 
        'expiry_date': None, 
        'cost_price': None
    }, format='json')
    print('Batch Response:', b_resp.status_code, b_resp.data if hasattr(b_resp, 'data') else b_resp.content)
else:
    print('No products found.')
