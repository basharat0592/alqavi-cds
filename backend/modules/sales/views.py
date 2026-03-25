from modules.inventory.models import Inventory, InventoryMovement, Warehouse
"""
Sales module API views — Order management endpoints.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate
from datetime import timedelta
from .models import Order, OrderItem, PurchaseOrder, PurchaseOrderItem, PurchaseReturn, PurchaseReturnItem
from .serializers import (
    OrderSerializer, OrderListSerializer, OrderCreateUpdateSerializer,
    PurchaseOrderListSerializer, PurchaseOrderDetailSerializer,
    PurchaseReturnListSerializer, PurchaseReturnDetailSerializer
)
from core.utils import get_or_404_response
from modules.products.models import Product
from modules.users.models import UserActivityLog





@api_view(['GET'])
@permission_classes([AllowAny])
def list_orders(request):
    """List all orders with proper pagination, search, and filtering."""
    from rest_framework.pagination import PageNumberPagination
    
    orders = Order.objects.all().order_by('-created_at')

    # Search by fields
    search = request.query_params.get('search')
    if search:
        orders = orders.filter(
            Q(order_number__icontains=search) |
            Q(customer__username__icontains=search) |
            Q(customer__first_name__icontains=search) |
            Q(customer__last_name__icontains=search) |
            Q(guest_name__icontains=search)
        )

    # Status filter
    status_filter = request.query_params.get('status')
    if status_filter:
        orders = orders.filter(status=status_filter)

    # Exclude status filter
    exclude_status = request.query_params.get('exclude_status')
    if exclude_status:
        orders = orders.exclude(status=exclude_status)

    # Payment status filter
    payment_status = request.query_params.get('payment_status')
    if payment_status:
        orders = orders.filter(payment_status=payment_status)

    # Date range filters
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    if start_date:
        orders = orders.filter(created_at__date__gte=start_date)
    if end_date:
        orders = orders.filter(created_at__date__lte=end_date)

    # Pagination
    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(orders, request)
    if page is not None:
        serializer = OrderListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    serializer = OrderListSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def order_detail(request, order_id):
    """Retrieve a specific order with items."""
    order, err = get_or_404_response(Order, id=order_id)
    if err:
        return err
    return Response(OrderSerializer(order).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_order(request):
    """Create a new order, add items, and update stock/payments."""
    from django.db import transaction
    from modules.products.models import Product
    from modules.inventory.models import Inventory, InventoryMovement, Warehouse
    from modules.payments.models import Payment, PaymentCategory
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
                
                # Log Activity
                UserActivityLog.objects.create(
                    user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                    action='create',
                    description=f'Created new sale order {order.order_number} for RS {order.total_amount}'
                )
                
                # Default warehouse for stock deduction
                warehouse = Warehouse.objects.filter(is_default=True).first() or Warehouse.objects.first()
                
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
                            # Deduct Stock if created in a confirmed/delivered state (e.g. POS)
                            deducted_states = ['confirmed', 'processing', 'shipped', 'delivered', 'completed']
                            if order.status in deducted_states:
                                # Reduce global product stock
                                product.quantity_in_stock = max(0, product.quantity_in_stock - quantity)
                                product.save()
                                
                                # Deduct from warehouse inventory
                                if warehouse:
                                    # Safely handle multiple inventory records (batches) - pick one or create default
                                    inv = Inventory.objects.filter(
                                        product=product, 
                                        warehouse=warehouse
                                    ).order_by('-quantity_available').first()
                                    
                                    if not inv:
                                        inv = Inventory.objects.create(
                                            product=product,
                                            warehouse=warehouse,
                                            quantity_available=0
                                        )
                                    
                                    prev_qty = float(inv.quantity_available)
                                    inv.quantity_available = max(0, prev_qty - quantity)
                                    inv.save()
                                    
                                    InventoryMovement.objects.create(
                                        product=product,
                                        warehouse=warehouse,
                                        movement_type='Sale',
                                        quantity=-quantity,
                                        previous_quantity=prev_qty,
                                        new_quantity=inv.quantity_available,
                                        reference_id=str(order.order_number),
                                        notes=f"Stock automatically deducted for immediate order: {order.order_number}",
                                        created_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                                    )
                
                # Automatically create an inbound Payment for the Sale to increase company revenue/balance
                if order.total_amount > 0:
                    payment_category, _ = PaymentCategory.objects.get_or_create(
                        name='Sales', 
                        defaults={'description': 'Incoming payments from sales'}
                    )
                    payer_name = order.customer.get_full_name() if order.customer else (order.guest_name or 'Walk-in Customer')
                    
                    method_str = (order.payment_method or '').lower()
                    if 'card' in method_str or 'bank' in method_str:
                        pay_method = 'bank_transfer'
                    elif 'wallet' in method_str or 'jazzcash' in method_str or 'easypaisa' in method_str:
                        pay_method = 'mobile_wallet'
                    elif 'check' in method_str:
                        pay_method = 'check'
                    elif 'cash' in method_str:
                        pay_method = 'cash'
                    else:
                        pay_method = 'other'

                    Payment.objects.create(
                        amount=order.total_amount,
                        payment_type='inbound',
                        method=pay_method,
                        category=payment_category,
                        reference_number=str(order.order_number),
                        payer_payee=payer_name,
                        description=f"Revenue from Sale Order {order.order_number}",
                        user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                    )
                            
                return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    print(f"DEBUG: Order validation errors: {serializer.errors}")
    return Response({
        "error": "Validation failed",
        "errors": serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([AllowAny])
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
            
            # Inventory Management Logic
            # 1. Deduct Stock: When status moves from a non-fulfilled state to 'confirmed'
            deducted_states = ['confirmed', 'processing', 'shipped', 'delivered', 'completed']
            undeducted_states = ['ordered', 'pending', 'cancelled', 'rejected']
            
            if old_status in undeducted_states and new_status in deducted_states:
                warehouse = Warehouse.objects.filter(is_default=True).first() or Warehouse.objects.first()
                for item in updated_order.items.all():
                    if item.product:
                        qty = item.quantity
                        # Reduce global product stock
                        item.product.quantity_in_stock = max(0, item.product.quantity_in_stock - qty)
                        item.product.save()
                        
                        # Deduct from warehouse inventory
                        if warehouse:
                            # Safely handle multiple inventory records (batches)
                            inv = Inventory.objects.filter(
                                product=item.product, 
                                warehouse=warehouse
                            ).order_by('-quantity_available').first()
                            
                            if not inv:
                                inv = Inventory.objects.create(
                                    product=item.product,
                                    warehouse=warehouse,
                                    quantity_available=0
                                )
                            
                            prev_qty = float(inv.quantity_available)
                            inv.quantity_available = max(0, prev_qty - qty)
                            inv.save()
                            
                            InventoryMovement.objects.create(
                                product=item.product,
                                warehouse=warehouse,
                                movement_type='Sale',
                                quantity=-qty,
                                previous_quantity=prev_qty,
                                new_quantity=inv.quantity_available,
                                reference_id=str(updated_order.order_number),
                                notes=f"Stock deducted via admin confirmation of Order {updated_order.order_number}",
                                created_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                            )
            
            # 2. Restore Stock: When status moves from a fulfilled state back to a non-fulfilled state (Cancellation/Rejection)
            elif old_status in deducted_states and new_status in ['cancelled', 'rejected']:
                warehouse = Warehouse.objects.filter(is_default=True).first() or Warehouse.objects.first()
                for item in updated_order.items.all():
                    if item.product:
                        qty = item.quantity
                        item.product.quantity_in_stock += qty
                        item.product.save()
                        
                        if warehouse:
                            # Safely handle multiple inventory records (batches)
                            inv = Inventory.objects.filter(
                                product=item.product, 
                                warehouse=warehouse
                            ).order_by('-quantity_available').first()
                            
                            if not inv:
                                inv = Inventory.objects.create(
                                    product=item.product,
                                    warehouse=warehouse,
                                    quantity_available=0
                                )
                                
                            prev_qty = float(inv.quantity_available)
                            inv.quantity_available += qty
                            inv.save()
                            
                            InventoryMovement.objects.create(
                                product=item.product,
                                warehouse=warehouse,
                                movement_type='Return',
                                quantity=qty,
                                previous_quantity=prev_qty,
                                new_quantity=inv.quantity_available,
                                reference_id=str(updated_order.order_number),
                                notes=f"Stock restored due to order cancellation/rejection: {updated_order.order_number}",
                                created_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                            )
            
            return Response(OrderSerializer(updated_order).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_order(request, order_id):
    """Delete an order (admin only)."""
    order, err = get_or_404_response(Order, id=order_id)
    if err:
        return err

    order.delete()
    return Response({'message': 'Order deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """Get comprehensive dashboard statistics for admin overview."""
    today = timezone.now().date()
    month_ago = today - timedelta(days=30)

    # Basic Counts
    total_orders = Order.objects.count()
    orders_today = Order.objects.filter(created_at__date=today).count()
    
    # Revenue Calculations
    # Gross Revenue from Sales
    valid_orders = Order.objects.filter(payment_status='completed')
    gross_revenue = valid_orders.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    
    # Expenses from Paid Purchase Orders
    paid_purchases = PurchaseOrder.objects.filter(payment_status='paid')
    total_expenses = paid_purchases.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    
    # Net Revenue
    total_net_revenue = float(gross_revenue) - float(total_expenses)

    revenue_today = (
        valid_orders.filter(created_at__date=today)
        .aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    )
    expenses_today = (
        paid_purchases.filter(created_at__date=today)
        .aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    )
    net_revenue_today = float(revenue_today) - float(expenses_today)

    # 30-Day Revenue History
    history = (
        Order.objects.filter(created_at__date__gte=month_ago)
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(
            revenue=Sum('total_amount', filter=Q(payment_status='completed')),
            orders=Count('id')
        )
        .order_by('date')
    )
    
    # Purchase history for net calculation
    purchase_history = (
        PurchaseOrder.objects.filter(created_at__date__gte=month_ago, payment_status='paid')
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(expense=Sum('total_amount'))
        .order_by('date')
    )
    purchase_map = {p['date'].strftime('%Y-%m-%d'): p['expense'] for p in purchase_history}
    
    # Format history for frontend
    history_map = {h['date'].strftime('%Y-%m-%d'): h for h in history}
    formatted_history = []
    for i in range(30):
        d = today - timedelta(days=29-i)
        d_str = d.strftime('%Y-%m-%d')
        h = history_map.get(d_str, {'revenue': 0, 'orders': 0})
        exp = float(purchase_map.get(d_str, 0) or 0)
        formatted_history.append({
            'date': d.strftime('%b %d'),
            'revenue': float(h['revenue'] or 0) - exp,
            'orders': h['orders'] or 0
        })

    # Recent Orders
    recent = Order.objects.all().order_by('-created_at')[:5]
    recent_serialized = OrderListSerializer(recent, many=True).data

    # Recent Purchase Orders
    recent_purchases = PurchaseOrder.objects.all().order_by('-created_at')[:5]
    recent_purchases_serialized = PurchaseOrderListSerializer(recent_purchases, many=True).data

    # Top Products
    top_products_data = (
        OrderItem.objects.values('product', 'product__name')
        .annotate(sales=Sum('quantity'))
        .order_by('-sales')[:5]
    )
    formatted_top_products = [
        {'id': p['product'], 'name': p['product__name'], 'sales': p['sales']}
        for p in top_products_data
    ]

    return Response({
        'total_orders': total_orders,
        'orders_today': orders_today,
        'total_revenue': total_net_revenue,
        'revenue_today': net_revenue_today,
        'revenue_history': formatted_history,
        'recent_orders': recent_serialized,
        'recent_purchases': recent_purchases_serialized,
        'top_products': formatted_top_products,
        'pending_orders': Order.objects.filter(status='pending').count(),
        'delivered_orders': Order.objects.filter(status='delivered').count(),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def recent_orders(request):
    """Get recently created orders for the dashboard."""
    limit = int(request.query_params.get('limit', 10))
    orders = Order.objects.all()[:limit]
    return Response(OrderListSerializer(orders, many=True).data)


# ===========================================================================
# PURCHASE ORDERS
# ===========================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_purchases(request):
    """List purchase orders with optional search/status filter."""
    purchases = PurchaseOrder.objects.all()
    search = request.query_params.get('search')
    if search:
        purchases = purchases.filter(
            Q(purchase_number__icontains=search) | Q(supplier_name__icontains=search)
        )
    status_filter = request.query_params.get('status')
    if status_filter:
        purchases = purchases.filter(status=status_filter)
    return Response({'results': PurchaseOrderListSerializer(purchases, many=True).data, 'count': purchases.count()})


@api_view(['POST'])
@permission_classes([AllowAny])
def create_purchase(request):
    """Create a purchase order with nested items."""
    data = request.data.copy()
    items_data = data.pop('items', [])
    try:
        from django.db import transaction
        with transaction.atomic():
            po = PurchaseOrder.objects.create(
                purchase_number=data.get('purchase_number'),
                supplier_name=data.get('supplier_name', ''),
                supplier_phone=data.get('supplier_phone', ''),
                order_date=data.get('order_date'),
                expected_delivery_date=data.get('expected_delivery_date') or None,
                tax_amount=data.get('tax_amount', 0),
                shipping_cost=data.get('shipping_cost', 0),
                status=data.get('status', 'draft'),
                payment_status=data.get('payment_status', 'pending'),
                notes=data.get('notes', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            
            # Log Activity
            UserActivityLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                action='create',
                description=f'Created purchase order: {po.purchase_number} from {po.supplier_name}'
            )
            # Get default warehouse
            warehouse = Warehouse.objects.filter(is_default=True).first() or Warehouse.objects.first()
            
            total = 0
            for item in items_data:
                qty = int(item.get('quantity', 1))
                price = float(item.get('unit_price', 0))
                subtotal = qty * price
                
                p_item = PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    product_id=item.get('product'),
                    quantity=qty,
                    unit_price=price,
                    subtotal=subtotal,
                )
                
                # Update stock if order is NOT in draft or cancelled status
                if po.status in ['ordered', 'received', 'partially_received']:
                    # Update Product Stock
                    product = p_item.product
                    product.quantity_in_stock += qty
                    product.cost = price # Update cost to latest purchase price
                    product.save()
                    
                    # Update Inventory and Stock Ledger
                    if warehouse:
                        # Safely handle multiple inventory records (batches)
                        inv = Inventory.objects.filter(
                            product=product, 
                            warehouse=warehouse
                        ).order_by('-quantity_available').first()
                        
                        if not inv:
                            inv = Inventory.objects.create(
                                product=product,
                                warehouse=warehouse,
                                quantity_available=0
                            )
                        
                        prev_qty = inv.quantity_available
                        inv.quantity_available += qty
                        inv.save()
                        
                        InventoryMovement.objects.create(
                            product=product,
                            warehouse=warehouse,
                            movement_type='Purchase',
                            quantity=qty,
                            previous_quantity=prev_qty,
                            new_quantity=inv.quantity_available,
                            reference_id=po.purchase_number,
                            notes=f"Stock added via Purchase Order {po.purchase_number}",
                            created_by=request.user if request.user.is_authenticated else None
                        )
                
                total += subtotal
                
            po.total_amount = total + float(data.get('shipping_cost', 0)) + float(data.get('tax_amount', 0))
            po.save()

            # Automatically create an outbound Payment for the Purchase to decrease company cash/balance
            from modules.payments.models import Payment, PaymentCategory
            if po.total_amount > 0:
                payment_category, _ = PaymentCategory.objects.get_or_create(
                    name='Purchases', 
                    defaults={'description': 'Outgoing payments for stock purchases'}
                )
                Payment.objects.create(
                    amount=po.total_amount,
                    payment_type='outbound',
                    method='cash',
                    category=payment_category,
                    reference_number=str(po.purchase_number),
                    payer_payee=po.supplier_name or 'Supplier',
                    description=f"Payment for Purchase Order {po.purchase_number}",
                    user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                )

        return Response(PurchaseOrderDetailSerializer(po).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def purchase_detail(request, pk):
    """Retrieve, update, or delete a purchase order."""
    po, err = get_or_404_response(PurchaseOrder, id=pk)
    if err: return err
    if request.method == 'GET':
        return Response(PurchaseOrderDetailSerializer(po).data)
    elif request.method == 'PATCH':
        items_data = request.data.get('items')
        
        from django.db import transaction
        try:
            with transaction.atomic():
                # Handle Status Transition to 'received'
                old_status = po.status
                new_status = request.data.get('status', old_status)
                
                # Update basic fields
                for field in ['purchase_number', 'supplier_name', 'supplier_phone', 'status', 'payment_status', 'notes', 'tax_amount', 'shipping_cost', 'order_date']:
                    if field in request.data:
                        setattr(po, field, request.data[field])
                po.save()

                if items_data is not None:
                    # Remove existing items
                    po.items.all().delete()
                    
                    # Create new items
                    for item in items_data:
                        qty = int(item.get('quantity', 1))
                        price = float(item.get('unit_price', 0))
                        subtotal = qty * price
                        
                        PurchaseOrderItem.objects.create(
                            purchase_order=po,
                            product_id=item.get('product'),
                            quantity=qty,
                            unit_price=price,
                            subtotal=subtotal,
                        )

                was_stocked = old_status in ['ordered', 'received', 'partially_received']
                is_stocking = new_status in ['ordered', 'received', 'partially_received']

                if not was_stocked and is_stocking:
                    # Add stock now for all items
                    warehouse = Warehouse.objects.filter(is_default=True).first() or Warehouse.objects.first()
                    for item in po.items.all():
                        product = item.product
                        product.quantity_in_stock += item.quantity
                        product.cost = item.unit_price
                        product.save()

                        if warehouse:
                            # Safely handle multiple inventory records (batches)
                            inv = Inventory.objects.filter(
                                product=product, 
                                warehouse=warehouse
                            ).order_by('-quantity_available').first()
                            
                            if not inv:
                                inv = Inventory.objects.create(
                                    product=product,
                                    warehouse=warehouse,
                                    quantity_available=0
                                )
                            
                            prev_qty = inv.quantity_available
                            inv.quantity_available += item.quantity
                            inv.save()

                            InventoryMovement.objects.create(
                                product=product,
                                warehouse=warehouse,
                                movement_type='Purchase',
                                quantity=item.quantity,
                                previous_quantity=prev_qty,
                                new_quantity=inv.quantity_available,
                                reference_id=po.purchase_number,
                                notes=f"Stock added via transition to RECEIVED on PO {po.purchase_number}",
                                created_by=request.user if request.user.is_authenticated else None
                            )
            return Response(PurchaseOrderDetailSerializer(po).data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    elif request.method == 'DELETE':
        try:
            order_num = po.purchase_number
            po.delete()
            # Log Activity
            UserActivityLog.objects.create(
                user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                action='delete',
                description=f'Deleted purchase order: {order_num}'
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# PURCHASE RETURNS
# ===========================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def list_purchase_returns(request):
    """List purchase returns."""
    returns = PurchaseReturn.objects.all()
    return Response({'results': PurchaseReturnListSerializer(returns, many=True).data, 'count': returns.count()})


@api_view(['POST'])
@permission_classes([AllowAny])
def create_purchase_return(request):
    """Create a purchase return with nested items."""
    data = request.data.copy()
    items_data = data.pop('items', [])
    try:
        from django.db import transaction
        with transaction.atomic():
            ret = PurchaseReturn.objects.create(
                return_number=data.get('return_number'),
                purchase_order_id=data.get('purchase_order') or None,
                supplier_name=data.get('supplier_name', ''),
                return_date=data.get('return_date'),
                status=data.get('status', 'pending'),
                reason=data.get('reason', ''),
                created_by=request.user if request.user.is_authenticated else None,
            )
            total = 0
            for item in items_data:
                subtotal = float(item.get('quantity', 1)) * float(item.get('refund_price', 0))
                PurchaseReturnItem.objects.create(
                    purchase_return=ret,
                    product_id=item.get('product'),
                    quantity=item.get('quantity', 1),
                    refund_price=item.get('refund_price', 0),
                    subtotal=subtotal,
                )
                total += subtotal
            ret.total_refund_amount = total
            ret.save()
        return Response(PurchaseReturnDetailSerializer(ret).data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([AllowAny])
def purchase_return_detail(request, pk):
    """Retrieve, update or delete a purchase return."""
    ret, err = get_or_404_response(PurchaseReturn, id=pk)
    if err: return err
    if request.method == 'GET':
        return Response(PurchaseReturnDetailSerializer(ret).data)
    elif request.method == 'PATCH':
        for field in ['status', 'reason', 'supplier_name']:
            if field in request.data:
                setattr(ret, field, request.data[field])
        ret.save()
        return Response(PurchaseReturnDetailSerializer(ret).data)
    elif request.method == 'DELETE':
        ret.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
def track_order(request, order_number):
    """Public order tracking by human-readable number (ORD-xxxx)."""
    try:
        from .serializers import OrderSerializer
        order = Order.objects.get(order_number=order_number)
        return Response(OrderSerializer(order).data)
    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
