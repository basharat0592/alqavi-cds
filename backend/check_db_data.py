import os
import django
import sys

# Set up Django environment
sys.path.append('c:\\Users\\Dell\\OneDrive\\Documents\\cosmetic-distributor-system\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.products.models import Product, Category
from modules.sales.models import Order
from modules.users.models import User

def check_counts():
    print(f"Products: {Product.objects.count()}")
    print(f"Categories: {Category.objects.count()}")
    print(f"Orders: {Order.objects.count()}")
    print(f"Users: {User.objects.count()}")
    
    if Product.objects.exists():
        print("\nLast 3 Products:")
        for p in Product.objects.all().order_by('-created_at')[:3]:
            print(f"- {p.name} (PKR {p.price}) stock: {p.quantity_in_stock}")
            
    if Order.objects.exists():
        print("\nLast 3 Orders:")
        for o in Order.objects.all().order_by('-created_at')[:3]:
            print(f"- Order #{o.id}: {o.total_amount} status: {o.status}")

if __name__ == "__main__":
    check_counts()
