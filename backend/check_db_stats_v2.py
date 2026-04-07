import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.sales.models import Order, PurchaseOrder

def check():
    print(f"DEBUG: All Orders Count: {Order.objects.count()}")
    print(f"DEBUG: All PurchaseOrders Count: {PurchaseOrder.objects.count()}")
    
    today = timezone.now().date()
    month_ago = today - timedelta(days=30)
    
    orders_30 = Order.objects.filter(created_at__date__gte=month_ago)
    print(f"DEBUG: Orders last 30 days: {orders_30.count()}")
    
    pos_30 = PurchaseOrder.objects.filter(created_at__date__gte=month_ago)
    print(f"DEBUG: PurchaseOrders last 30 days: {pos_30.count()}")

if __name__ == "__main__":
    check()
