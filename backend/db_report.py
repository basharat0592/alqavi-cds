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

print(f"--- DATABASE REPORT ---")
print(f"Products: {Product.objects.count()}")
for p in Product.objects.all():
    print(f"  - {p.name} (PKR {p.price})")

print(f"Categories: {Category.objects.count()}")
for c in Category.objects.all():
    print(f"  - {c.name}")

print(f"Users: {User.objects.count()}")
for u in User.objects.all():
    print(f"  - {u.username} (Staff: {u.is_staff})")

print(f"Activity Logs: {UserActivityLog.objects.count()}")
for l in UserActivityLog.objects.all().order_by('-timestamp')[:5]:
    print(f"  - [{l.timestamp}] {l.action}: {l.description}")

print(f"Orders: {Order.objects.count()}")
