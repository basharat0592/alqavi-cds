"""
Sales module business logic services.
"""
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Order, OrderItem
from modules.products.models import Product


class OrderService:
    """Service class for order-related operations."""
    
    @staticmethod
    def create_order(customer, order_number, items_data):
        """
        Create a new order with items.
        
        Args:
            customer: Customer user object
            order_number: Unique order identifier
            items_data: List of {product_id, quantity, price}
            
        Returns:
            Order: Created order object
        """
        order = Order.objects.create(
            customer=customer,
            order_number=order_number,
            status='pending',
            payment_status='pending'
        )
        
        total = 0
        for item in items_data:
            product = Product.objects.get(id=item['product_id'])
            subtotal = item['quantity'] * item['price']
            
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item['quantity'],
                price=item['price']
            )
            total += subtotal
        
        order.total_amount = total
        order.save()
        return order
    
    @staticmethod
    def calculate_order_total(order):
        """Calculate total for an order based on items."""
        total = order.items.aggregate(
            total=Sum('quantity') * Sum('price')
        )
        return total['total'] or 0
    
    @staticmethod
    def get_pending_orders_count():
        """Get count of pending orders."""
        return Order.objects.filter(status='pending').count()
    
    @staticmethod
    def get_today_orders_count():
        """Get count of orders created today."""
        today = timezone.now().date()
        return Order.objects.filter(created_at__date=today).count()
    
    @staticmethod
    def get_today_revenue():
        """Get total revenue for today."""
        today = timezone.now().date()
        revenue = Order.objects.filter(
            created_at__date=today,
            payment_status='completed'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        return float(revenue)
    
    @staticmethod
    def get_week_orders():
        """Get orders from past 7 days."""
        week_ago = timezone.now().date() - timedelta(days=7)
        return Order.objects.filter(created_at__date__gte=week_ago)
    
    @staticmethod
    def get_month_revenue():
        """Get total revenue for current month."""
        today = timezone.now().date()
        month_start = today.replace(day=1)
        revenue = Order.objects.filter(
            created_at__date__gte=month_start,
            payment_status='completed'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        return float(revenue)
    
    @staticmethod
    def update_order_status(order_id, new_status):
        """Update order status."""
        order = Order.objects.get(id=order_id)
        order.status = new_status
        order.save()
        return order
    
    @staticmethod
    def update_payment_status(order_id, payment_status):
        """Update payment status for an order."""
        order = Order.objects.get(id=order_id)
        order.payment_status = payment_status
        order.save()
        return order
    
    @staticmethod
    def get_top_products(limit=5):
        """Get top selling products."""
        return Product.objects.annotate(
            total_sold=Sum('order_items__quantity')
        ).order_by('-total_sold')[:limit]
    
    @staticmethod
    def cancel_order(order_id, reason=''):
        """Cancel an order."""
        order = Order.objects.get(id=order_id)
        order.status = 'cancelled'
        if reason:
            order.notes = f"Cancelled - {reason}"
        order.save()
        return order


class RevenuService:
    """Service class for revenue-related calculations."""
    
    @staticmethod
    def get_total_revenue():
        """Get all-time total revenue."""
        revenue = Order.objects.filter(payment_status='completed').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        return float(revenue)
    
    @staticmethod
    def get_pending_revenue():
        """Get total pending (unpaid) revenue."""
        revenue = Order.objects.filter(
            payment_status='pending'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        return float(revenue)
    
    @staticmethod
    def get_revenue_by_period(days=30):
        """Get average daily revenue for a period."""
        start_date = timezone.now().date() - timedelta(days=days)
        revenue = Order.objects.filter(
            payment_status='completed',
            created_at__date__gte=start_date
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        avg_daily = float(revenue) / days if days > 0 else 0
        return {
            'total': float(revenue),
            'average_daily': avg_daily,
            'period_days': days
        }

