import os
import django
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.sales.models import Order, PurchaseOrder

def check_stats():
    today = timezone.now().date()
    month_ago = today - timedelta(days=30)
    
    orders = Order.objects.filter(created_at__date__gte=month_ago)
    print(f"Total Orders in last 30 days: {orders.count()}")
    
    history_data = (
        Order.objects.filter(created_at__date__gte=month_ago)
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(
            revenue=Sum('total_amount', filter=Q(payment_status='completed')),
            orders=Count('id')
        )
        .order_by('date')
    )
    print("Order History Data:")
    for h in history_data:
        print(f"  {h['date']}: Revenue={h['revenue']}, Orders={h['orders']}")

    purchases = PurchaseOrder.objects.filter(created_at__date__gte=month_ago)
    print(f"Total Purchase Orders in last 30 days: {purchases.count()}")
    
    purchase_history = (
        PurchaseOrder.objects.filter(created_at__date__gte=month_ago, payment_status='paid')
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(expense=Sum('total_amount'))
        .order_by('date')
    )
    print("Purchase History Data:")
    for p in purchase_history:
        print(f"  {p['date']}: Expense={p['expense']}")

if __name__ == "__main__":
    check_stats()
