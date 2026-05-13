import os
import sys
import django

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.sales.models import Order

order = Order.objects.filter(tracking_id='10060').first()
if order:
    print(f"Order {order.tracking_id} found.")
    print(f"Status: {order.status}")
    print(f"Customer: {order.customer_name}")
    print(f"Items count: {order.items.count()}")
    for item in order.items.all():
        print(f" - {item.product.product_name if item.product else 'None'} x {item.quantity}")
else:
    print("Order 10060 not found.")
