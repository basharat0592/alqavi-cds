import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.products.models import Product, Category
from modules.users.models import User, UserActivityLog
from modules.sales.models import Order

print(f"--- DATABASE DETAIL REPORT ---")
print(f"Products: {Product.objects.count()}")
for p in Product.objects.all():
    print(f"  - ID: {p.id} Name: {p.name} Status: {getattr(p, 'status', 'N/A')} Stock: {p.quantity_in_stock}")

print(f"\nUsers: {User.objects.count()}")
for u in User.objects.all():
    print(f"  - Username: {u.username} Role: {getattr(u.role, 'name', 'N/A')} Staff: {u.is_staff}")

print(f"\nOrders: {Order.objects.count()}")
for o in Order.objects.all():
    print(f"  - Order: {o.order_number} Status: {o.status} PayStatus: {o.payment_status}")

print(f"\nRecent Activity Logs: {UserActivityLog.objects.count()}")
for l in UserActivityLog.objects.all().order_by('-timestamp')[:5]:
    print(f"  - {l.action}: {l.description}")
