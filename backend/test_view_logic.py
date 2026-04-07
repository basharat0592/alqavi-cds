import json

# Try to get admin token or bypass auth if possible for local check
# Since we are on the server, we can check the db directly again but more thoroughly

import os
import django
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from modules.sales.models import Order, PurchaseOrder

def test_view_logic():
    today = timezone.now().date()
    month_ago = today - timedelta(days=30)
    
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
    
    print(f"DEBUG: history_data length: {len(history_data)}")
    for h in history_data:
        print(f"  Date: {h['date']}, Type: {type(h['date'])}, Revenue: {h['revenue']}")

    # Check purchase history
    purchase_history = (
        PurchaseOrder.objects.filter(created_at__date__gte=month_ago, payment_status='paid')
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(expense=Sum('total_amount'))
        .order_by('date')
    )
    print(f"DEBUG: purchase_history length: {len(purchase_history)}")
    for p in purchase_history:
        print(f"  Date: {p['date']}, Type: {type(p['date'])}, Expense: {p['expense']}")

if __name__ == "__main__":
    test_view_logic()
