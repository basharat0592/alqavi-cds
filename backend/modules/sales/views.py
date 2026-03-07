"""
Sales module API views — Order management endpoints.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Order, OrderItem
from .serializers import (
    OrderSerializer,
    OrderCreateUpdateSerializer,
    OrderListSerializer
)
from core.utils import get_or_404_response


@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_orders(request):
    """List all orders with optional filtering."""
    orders = Order.objects.all()

    status_filter = request.query_params.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)

    payment_status = request.query_params.get('payment_status')
    if payment_status:
        orders = orders.filter(payment_status=payment_status)

    customer_id = request.query_params.get('customer_id')
    if customer_id:
        orders = orders.filter(customer_id=customer_id)

    return Response(OrderListSerializer(orders, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def order_detail(request, order_id):
    """Retrieve a specific order with items."""
    order, err = get_or_404_response(Order, id=order_id)
    if err:
        return err
    return Response(OrderSerializer(order).data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def create_order(request):
    """Create a new order, add items, and update stock."""
    from django.db import transaction
    from modules.products.models import Product
    import json
    
    # Extract items from request data if any
    data = request.data.copy()
    items_data = data.pop('items', [])
    if isinstance(items_data, str):
        try:
            items_data = json.loads(items_data)
        except:
            items_data = []

    serializer = OrderCreateUpdateSerializer(data=data)
    if serializer.is_valid():
        try:
            with transaction.atomic():
                order = serializer.save()
                
                # Create OrderItems and adjust stock
                for item_dt in items_data:
                    product_id = item_dt.get('product_id')
                    quantity = int(item_dt.get('quantity', 1))
                    price = float(item_dt.get('price', 0))
                    
                    if product_id:
                        product, _ = get_or_404_response(Product, id=product_id)
                        if not _:
                            OrderItem.objects.create(
                                order=order,
                                product=product,
                                quantity=quantity,
                                price=price
                            )
                            # Reduce stock
                            product.quantity_in_stock = max(0, product.quantity_in_stock - quantity)
                            product.save()
                            
                return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def update_order(request, order_id):
    """Update order status or payment information and handle stock return if cancelled."""
    from django.db import transaction
    order, err = get_or_404_response(Order, id=order_id)
    if err:
        return err

    old_status = order.status
    serializer = OrderCreateUpdateSerializer(order, data=request.data, partial=True)
    
    if serializer.is_valid():
        with transaction.atomic():
            updated_order = serializer.save()
            new_status = updated_order.status
            
            # If changed to cancelled, refund stock
            if old_status != 'cancelled' and new_status == 'cancelled':
                for item in updated_order.items.all():
                    if item.product:
                        item.product.quantity_in_stock += item.quantity
                        item.product.save()
            
            return Response(OrderSerializer(updated_order).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_order(request, order_id):
    """Delete an order (admin only)."""
    order, err = get_or_404_response(Order, id=order_id)
    if err:
        return err

    order.delete()
    return Response({'message': 'Order deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def dashboard_stats(request):
    """Get dashboard statistics for admin overview."""
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)

    total_orders = Order.objects.count()
    orders_today = Order.objects.filter(created_at__date=today).count()
    orders_this_week = Order.objects.filter(created_at__date__gte=week_ago).count()

    valid_orders = Order.objects.filter(payment_status='completed')

    total_revenue = valid_orders.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    revenue_today = (
        valid_orders.filter(created_at__date=today)
        .aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    )

    pending_payments = (
        Order.objects.filter(payment_status='pending')
        .aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    )

    return Response({
        'total_orders': total_orders,
        'orders_today': orders_today,
        'orders_this_week': orders_this_week,
        'total_revenue': float(total_revenue),
        'revenue_today': float(revenue_today),
        'pending_orders': Order.objects.filter(status='pending').count(),
        'processing_orders': Order.objects.filter(status='processing').count(),
        'shipped_orders': Order.objects.filter(status='shipped').count(),
        'delivered_orders': Order.objects.filter(status='delivered').count(),
        'pending_payments': float(pending_payments),
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def recent_orders(request):
    """Get recently created orders for the dashboard."""
    limit = int(request.query_params.get('limit', 10))
    orders = Order.objects.all()[:limit]
    return Response(OrderListSerializer(orders, many=True).data)
