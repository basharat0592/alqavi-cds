from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db import models
from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from .models import Order, OrderItem, PurchaseOrder, PurchaseOrderItem, PurchaseReturn, PurchaseReturnItem, CustomerBoughtProduct, SaleReturn, SaleReturnItem
from .serializers import OrderSerializer, CreateOrderSerializer, PurchaseOrderSerializer, PurchaseReturnSerializer, OrderStatsSerializer, CustomerBoughtProductSerializer, SaleReturnSerializer
from modules.products.models import SupplierProduct
from modules.inventory.models import StockMovement


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def track_order_by_id(request, tracking_id):
    try:
        tid_str = str(tracking_id).strip()
        # First try finding by tracking_id
        order = Order.objects.filter(tracking_id=tid_str).first()
        if not order:
            # Fallback for full UUID lookup
            from django.db.models import Q
            order = Order.objects.filter(id=tid_str).first()
            
        if not order:
            return Response({'error': 'Order not found. Please check the order ID and try again.'}, status=404)
            
        return Response(OrderSerializer(order, context={'request': request}).data)
    except Exception as e:
        return Response({'error': 'Invalid order ID format.'}, status=400)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrderSerializer
        return OrderSerializer

    def get_permissions(self):
        if self.action in ['create', 'track']:
            return [permissions.AllowAny()]
        if self.action in ['update', 'partial_update', 'stats']:
            return [permissions.IsAdminUser()]
        if self.action in ['destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": f"Deletion failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        user = self.request.user

        if not user.is_authenticated:
            return Order.objects.none()

        if getattr(user, "is_staff", False):
            queryset = Order.objects.select_related('customer', 'user').all()
        else:
            from modules.customer.models import Customer
            from django.db.models import Q
            is_customer_identity = (
                isinstance(user, Customer) or 
                getattr(user, "is_customer", False) or 
                user.__class__.__name__ == "Customer"
            )
            is_supplier_identity = (
                getattr(user, "is_supplier", False) or 
                user.__class__.__name__ == "Supplier"
            )
            if is_customer_identity:
                queryset = Order.objects.filter(Q(customer_id=user.id) | Q(user_id=user.id))
            elif is_supplier_identity:
                supplier_id = getattr(user, "real_id", None)
                if supplier_id:
                    queryset = Order.objects.filter(items__product__supplier_id=supplier_id).distinct()
                else:
                    queryset = Order.objects.none()
            else:
                queryset = Order.objects.filter(user=user)

        status_filter = self.request.query_params.get('status')
        date_filter = self.request.query_params.get('date')
        exclude_status = self.request.query_params.get('exclude_status')
        search = self.request.query_params.get('search')
        
        if status_filter and status_filter != 'All':
            statuses = [s.strip().upper() for s in status_filter.split(',')]
            queryset = queryset.filter(status__in=statuses)
        if date_filter:
            queryset = queryset.filter(created_at__date=date_filter)
        if exclude_status:
            statuses = [s.upper() for s in exclude_status.split(',')]
            queryset = queryset.exclude(status__in=statuses)
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(tracking_id__icontains=search) | 
                Q(customer_name__icontains=search) | 
                Q(phone_number__icontains=search)
            )

        # 3. Market/Channel Filter (POS vs Online)
        market = self.request.query_params.get('market')
        if market == 'POS':
            queryset = queryset.filter(payment_method='SHOP')
        elif market == 'Online':
            queryset = queryset.filter(payment_method__in=['COD', 'ONLINE'])

        return queryset.order_by('-created_at')

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def track(self, request):
        tracking_id = request.query_params.get('tid')
        if not tracking_id:
            return Response({"error": "Tracking ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order = Order.objects.get(tracking_id=tracking_id)
            serializer = OrderSerializer(order)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def bought_products(self, request):
        user = request.user
        from modules.customer.models import Customer
        from django.db.models import Q

        is_customer_identity = (
            isinstance(user, Customer) or 
            getattr(user, "is_customer", False) or 
            user.__class__.__name__ == "Customer"
        )
        is_supplier_identity = (
            getattr(user, "is_supplier", False) or 
            user.__class__.__name__ == "Supplier"
        )
        if is_customer_identity:
            queryset = Order.objects.filter(Q(customer_id=user.id) | Q(user_id=user.id))
        elif is_supplier_identity:
            supplier_id = getattr(user, "real_id", None)
            if supplier_id:
                queryset = Order.objects.filter(items__product__supplier_id=supplier_id).distinct()
            else:
                queryset = Order.objects.none()
        else:
            queryset = Order.objects.filter(user=user)

        items = OrderItem.objects.filter(
            order__in=queryset,
            order__status="DELIVERED"
        ).select_related("order", "product")
        # Return a clean list, excluding items with deleted products
        results = []
        for item in items:
            if not item.product:
                continue
                
            results.append({
                'id': f"{item.order.id}-{item.product.id}",
                'product': item.product.id,
                'product_name': item.product.product_name,
                'weight': item.product.weight,
                'size': item.product.size,
                'image': item.product.image.url if item.product.image else None,
                'order': item.order.id,
                'order_number': item.order.tracking_id,
                'quantity': item.quantity,
                'price': float(item.price),
                'purchased_at': item.order.created_at,
                'delivered_at': item.order.delivered_at or item.order.updated_at
            })
            
        return Response(results)

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        if order.status == 'DELIVERED':
            return Response({"error": "Delivered orders are locked and cannot be modified."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)


    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def stats(self, request):
        date_filter = request.query_params.get('date')
        payment_method = request.query_params.get('payment_method')
        
        if date_filter:
            try:
                from datetime import datetime
                today = datetime.strptime(date_filter, '%Y-%m-%d').date()
            except ValueError:
                today = timezone.now().date()
        else:
            today = timezone.now().date()
            
        # Base queryset WITH date/payment filters
        filtered_qs = Order.objects.all()
        if date_filter:
            filtered_qs = filtered_qs.filter(created_at__date=today)
        if payment_method and payment_method != 'ALL':
            filtered_qs = filtered_qs.filter(payment_method=payment_method.upper())

        # Metrics
        total_orders_filtered = filtered_qs.count()
        delivered_orders_qs = filtered_qs.filter(status='DELIVERED')
        delivered_count_filtered = delivered_orders_qs.count()
        
        # System-Wide Totals
        total_pending = Order.objects.filter(status='PENDING').count()
        total_active_all = Order.objects.exclude(status__in=['DELIVERED', 'CANCELLED']).count()
        system_total_orders = Order.objects.count()
        
        # Revenue Logic: Only Delivered orders count as revenue
        total_revenue = delivered_orders_qs.aggregate(tot=Sum('total_amount'))['tot'] or 0

        # Profit Logic
        from .models import OrderItem
        items = OrderItem.objects.filter(order__in=delivered_orders_qs)
        total_profit = items.annotate(
            item_profit=ExpressionWrapper(
                (F('price') - F('cost_price')) * F('quantity'),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            )
        ).aggregate(tot=Sum('item_profit'))['tot'] or 0
        
        # Accounts Payable: Sum of remaining balance on all active Purchase Orders
        from .models import PurchaseOrder
        total_payable = PurchaseOrder.objects.exclude(status='CANCELLED').annotate(
            balance=ExpressionWrapper(
                F('total_amount') - F('paid_amount'),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            )
        ).aggregate(tot=Sum('balance'))['tot'] or 0

        # Recent Orders for Dashboard
        recent_orders_qs = Order.objects.all().order_by('-created_at')[:50]
        recent_orders = OrderSerializer(recent_orders_qs, many=True, context={'request': request}).data

        # Revenue history for graph (last 7 days)
        history = []
        for i in range(6, -1, -1):
            d = today - timezone.timedelta(days=i)
            day_qs = Order.objects.filter(created_at__date=d, status='DELIVERED')
            if payment_method and payment_method != 'ALL':
                day_qs = day_qs.filter(payment_method=payment_method.upper())
            sales = day_qs.aggregate(t=Sum('total_amount'))['t'] or 0
            history.append({
                "date": d.strftime("%b %d"),
                "sales": float(sales),
                "revenue": float(sales)
            })

        return Response({
            "total_orders": total_orders_filtered,
            "system_total": system_total_orders,
            "total_revenue": float(total_revenue),
            "total_profit": float(total_profit),
            "total_payable": float(total_payable),
            "orders_today": Order.objects.filter(created_at__date=timezone.now().date()).count(),
            "pending_orders": total_pending,
            "total_active": total_active_all,
            "delivered_orders": delivered_count_filtered,
            "recent_orders": recent_orders,
            "revenue_history": history,
            "top_products": [],
            "recent_purchases": []
        })

    def partial_update(self, request, *args, **kwargs):
        try:
            from django.db import transaction
            from django.db.models import F
            
            order = self.get_object()
            if order.status == "DELIVERED":
                return Response({"error": "Delivered orders are locked and cannot be modified."}, status=status.HTTP_400_BAD_REQUEST)
            
            new_status = request.data.get("status", "").upper()
            old_status = order.status.upper()
            warehouse_id = request.data.get("warehouse_id")

            with transaction.atomic():
                # 1. RESERVE STOCK on Confirmation/Processing (Acceptance)
                acceptance_statuses = ["CONFIRMED", "PROCESSING", "SHIPPED"]
                if new_status in acceptance_statuses and not order.is_reserved:
                    for item in order.items.all():
                        if item.product:
                            item.product.reserved_quantity = F("reserved_quantity") + item.quantity
                            item.product.save()
                    order.is_reserved = True
                    order.save()

                # 2. DEDUCT PHYSICAL STOCK on Delivery
                if new_status == "DELIVERED" and old_status != "DELIVERED":
                    if not warehouse_id:
                        return Response({"error": "Warehouse selection is required for delivery."}, status=status.HTTP_400_BAD_REQUEST)
                    
                    from modules.inventory.models import Stock
                    for item in order.items.all():
                        if item.product:
                            # Release Reserved first if it was reserved
                            if order.is_reserved:
                                item.product.reserved_quantity = F("reserved_quantity") - item.quantity
                                item.product.save()
                            
                            # Actual Deduction from Physical Stock (Master Stock Table)
                            stock = Stock.objects.filter(
                                product_name__iexact=item.product.product_name,
                                weight=item.product.weight,
                                size=item.product.size,
                                warehouse_id=warehouse_id
                            ).first()
                            
                            if stock:
                                stock.total_quantity = F("total_quantity") - item.quantity
                                stock.save()
                                
                                # Update Linked Supplier Product quantity if exists
                                if hasattr(stock, "product") and stock.product:
                                    sp_prod = stock.product
                                    sp_prod.quantity = F("quantity") - item.quantity
                                    sp_prod.save()
                            
                            # Trigger re-aggregation of total_quantity in Admin Product record
                            item.product.save()

                            # Log into CustomerBoughtProduct for history/analytics
                            from .models import CustomerBoughtProduct
                            CustomerBoughtProduct.objects.get_or_create(
                                order=order,
                                product=item.product,
                                defaults={
                                    "customer": order.customer,
                                    "user": order.user,
                                    "quantity": item.quantity,
                                    "price": item.price
                                }
                            )
                    order.is_reserved = False
                    order.delivered_at = timezone.now()
                    order.save()

                # 3. RELEASE RESERVED on Cancellation or Rejection
                release_statuses = ["CANCELLED", "REJECTED"]
                if new_status in release_statuses and order.is_reserved:
                    for item in order.items.all():
                        if item.product:
                            item.product.reserved_quantity = F("reserved_quantity") - item.quantity
                            item.product.save()
                    order.is_reserved = False
                    order.save()

            # Execute original status change logic
            response = super(OrderViewSet, self).partial_update(request, *args, **kwargs)
            
            # 4. Trigger WhatsApp Confirmation if newly CONFIRMED (Accepted)
            if response.status_code == 200 and new_status == "CONFIRMED" and old_status != "CONFIRMED":
                try:
                    from .utils import send_whatsapp_order_confirmation, get_whatsapp_message_body
                    order.refresh_from_db()
                    message_body = get_whatsapp_message_body(order)
                    success, _ = send_whatsapp_order_confirmation(order)
                    
                    if isinstance(response.data, dict):
                        response.data["whatsapp_sent"] = success
                        response.data["whatsapp_message"] = message_body
                        response.data["whatsapp_number"] = order.whatsapp_number
                        
                except Exception as e:
                    import traceback
                    error_info = f"WhatsApp Automation Error: {str(e)}\n{traceback.format_exc()}\n"
                    print(error_info)
                    if isinstance(response.data, dict):
                        response.data["whatsapp_sent"] = False
                        response.data["whatsapp_error"] = str(e)

            return response
        except Exception as e:
            import traceback
            crash_info = f"CRITICAL PARTIAL_UPDATE CRASH: {str(e)}\n{traceback.format_exc()}\n"
            print(crash_info)
            return Response({"error": f"Internal Server Error: {str(e)}"}, status=500)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def request_cancel(self, request, pk=None):
        """Customer requests cancellation — only allowed before order is shipped."""
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)

        if not request.user.is_staff and order.customer_id != request.user.id and getattr(order.user, 'id', None) != request.user.id:
            return Response({'error': 'Not authorized to modify this order.'}, status=403)

        blocking = {'SHIPPED', 'DELIVERED', 'CANCELLED', 'CANCEL_REQUESTED'}
        if order.status.upper() in blocking:
            return Response(
                {"error": f"Cannot cancel order with status: {order.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'CANCEL_REQUESTED'
        order.save()
        return Response({'message': 'Cancellation request submitted.'})

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAdminUser])
    def update_status(self, request, pk=None):
        """Dedicated endpoint for updating order status, used by some frontend components."""
        return self.partial_update(request, pk=pk)


class SaleReturnViewSet(viewsets.ModelViewSet):
    queryset = SaleReturn.objects.all()
    serializer_class = SaleReturnSerializer
    
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_staff', False):
            return SaleReturn.objects.all()
        
        from modules.customer.models import Customer
        from django.db.models import Q
        is_customer = (
            isinstance(user, Customer) or 
            getattr(user, 'is_customer', False) or 
            user.__class__.__name__ == 'Customer'
        )
        if is_customer:
            return SaleReturn.objects.filter(Q(customer_id=user.id) | Q(user_id=user.id))
        return SaleReturn.objects.filter(user=user)

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        user = self.request.user
        request_data = self.request.data
        
        from modules.customer.models import Customer
        customer_obj = None
        user_obj = None
        
        is_customer = (
            isinstance(user, Customer) or 
            getattr(user, 'is_customer', False) or 
            user.__class__.__name__ == 'Customer'
        )
        
        if is_customer:
            customer_obj = Customer.objects.filter(id=user.id).first()
        else:
            user_obj = user

        sale_return = serializer.save(customer=customer_obj, user=user_obj)
        
        # Add items if provided in request
        items_data = request_data.get('items', [])
        for item in items_data:
            from modules.products.models import Product
            try:
                product = Product.objects.get(id=item.get('product_id'))
                SaleReturnItem.objects.create(
                    sale_return=sale_return,
                    product=product,
                    quantity=int(item.get('quantity', 1)),
                    price=float(item.get('price', product.selling_price))
                )
            except Exception: continue

    def update(self, request, *args, **kwargs):
        partial = kwargs.get('partial', False)
        instance = self.get_object()
        old_status = instance.status
        new_status = request.data.get('status', old_status)

        # Pass partial=True to super().update to allow status-only updates
        response = super().update(request, *args, **kwargs)

        # Only proceed with inventory logic if the update was successful
        if response.status_code < 400 and new_status == 'ACCEPTED' and old_status != 'ACCEPTED':
            try:
                from django.db import transaction
                from django.db.models import F
                with transaction.atomic():
                    for item in instance.items.all():
                        if item.product:
                            # 1. Add back to master Stock (Inventory)
                            if hasattr(item.product, 'stock') and item.product.stock:
                                stock = item.product.stock
                                stock.total_quantity = F('total_quantity') + item.quantity
                                stock.save()
                                
                                # 2. Add back to Supplier Product (All Products catalog)
                                if hasattr(stock, 'product') and stock.product:
                                    sp_prod = stock.product
                                    sp_prod.quantity = F('quantity') + item.quantity
                                    sp_prod.save()
                            
                            # 3. Add back to Admin Product record
                            product = item.product
                            product.total_quantity = F('total_quantity') + item.quantity
                            product.save()
            except Exception as e:
                print(f"Inventory Restock Error: {str(e)}")

            # Ledger: refund paid to customer → record as expense (money out).
            try:
                from modules.payments import services
                instance.refresh_from_db()
                services.record_sale_return(instance)
            except Exception as e:
                print(f"Ledger error (sale_return): {e}")

        return response

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def mark_received(self, request, pk=None):
        """Customer confirms they have received the order — only when SHIPPED."""
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)

        if not request.user.is_staff and order.customer_id != request.user.id and getattr(order.user, 'id', None) != request.user.id:
            return Response({'error': 'Not authorized to modify this order.'}, status=403)

        if order.status.upper() != 'SHIPPED':
            return Response(
                {'error': 'Order can only be marked as received after it has been shipped.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'DELIVERED'
        order.delivered_at = timezone.now()
        order.save()

        # Trigger inventory deduction (same logic as admin delivering)
        try:
            from django.db import transaction
            from django.db.models import F
            with transaction.atomic():
                for item in order.items.all():
                    if item.product:
                        if hasattr(item.product, 'stock') and item.product.stock:
                            stock = item.product.stock
                            stock.total_quantity = F('total_quantity') - item.quantity
                            stock.save()
                            
                            if hasattr(stock, 'product') and stock.product:
                                sp_prod = stock.product
                                sp_prod.quantity = F('quantity') - item.quantity
                                sp_prod.save()
                                
                        item.product.total_quantity = F('total_quantity') - item.quantity
                        item.product.save()

                        # Sync to CustomerBoughtProduct Table
                        from .models import CustomerBoughtProduct
                        CustomerBoughtProduct.objects.get_or_create(
                            order=order,
                            product=item.product,
                            defaults={
                                'customer': order.customer,
                                'user': order.user,
                                'quantity': item.quantity,
                                'price': item.price
                            }
                        )
        except Exception:
            pass  # Non-blocking — order is already marked delivered

        return Response(OrderSerializer(order, context={'request': request}).data)



class PurchaseViewSet(viewsets.ModelViewSet):
    """ViewSet for wholesale purchase orders from distributor to supplier"""
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = PurchaseOrder.objects.all()
        
        # 1. Base Filter (Staff vs Supplier)
        if user.is_staff:
            pass # Keep all
        elif hasattr(user, 'is_supplier') and user.is_supplier:
            qs = qs.filter(supplier_id=user.real_id)
        else:
            return PurchaseOrder.objects.none()

        # 2. Query Param Filters
        status_param = self.request.query_params.get('status')
        exclude_received = self.request.query_params.get('exclude_received')
        payment_status = self.request.query_params.get('payment_status')
        search = self.request.query_params.get('search')
        supplier_id = self.request.query_params.get('supplier')

        if exclude_received == 'true':
            qs = qs.exclude(status__in=['RECEIVED', 'CANCELLED'])
        
        if status_param and status_param != 'All':
            qs = qs.filter(status=status_param.upper())
        
        if payment_status and payment_status != 'All':
            qs = qs.filter(payment_status=payment_status.upper())

        if user.is_staff and supplier_id and supplier_id != 'All':
            qs = qs.filter(supplier_id=supplier_id)
            
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(purchase_number__icontains=search) | 
                Q(supplier__username__icontains=search) |
                Q(supplier__company__icontains=search) |
                Q(items__product__name__icontains=search)
            ).distinct()

        return qs.order_by('-order_date')

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def _sync_to_inventory(self, purchase):
        """Helper to sync PO items to Admin inventory and deduct from Supplier"""
        from django.db import transaction
        from django.db.models import F
        from modules.products.models import Product, SupplierProduct
        from modules.inventory.models import Stock, Warehouse
        from django.utils import timezone
        from decimal import Decimal

        try:
            warehouse = purchase.warehouse

            with transaction.atomic():
                for item in purchase.items.all():
                    sp = item.product
                    if not sp: continue
                    
                    units = item.total_units
                    
                    # 1. Deduct from Supplier available units
                    sp.quantity = F('quantity') - units
                    sp.save()
                    
                    # 2. Always create a NEW Stock entry for every purchase (Batch Tracking)
                    # This fulfills the requirement to keep every purchase entry separate
                    stock = Stock.objects.create(
                        product_name=sp.name,
                        product=sp,
                        category=sp.category,
                        supplier=purchase.supplier,
                        warehouse=warehouse,
                        purchase_type='single',
                        total_quantity=units,
                        price_per_item=item.price,
                        weight=item.weight,
                        size=item.size,
                        date=timezone.now().date()
                    )

                    # 3. Record the movement history
                    StockMovement.objects.create(
                        stock=stock,
                        movement_type='PURCHASE',
                        quantity=units,
                        to_warehouse=warehouse,
                        date=timezone.now().date(),
                        description=f"Purchase Order #{purchase.purchase_number} received"
                    )
            
            purchase.is_inventory_synced = True
            purchase.save()
            return True, ""
        except Exception as e:
            import traceback
            print(f"CRITICAL SYNC ERROR: {str(e)}")
            return False, str(e)

    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Mapping 'ORDERED' -> 'PENDING' for external/legacy compatibility
        if instance.status == 'ORDERED':
            instance.status = 'PENDING'
            instance.save()

        # Fulfillment logic: If newly RECEIVED and not yet synced
        # We check the instance status directly (DRF handles case-insensitivity on save usually)
        status_val = str(instance.status).upper()
        if status_val == 'RECEIVED' and not instance.is_inventory_synced:
            success, msg = self._sync_to_inventory(instance)
            if not success:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(f"Inventory sync failed: {msg}")

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAdminUser])
    def update_status(self, request, pk=None):
        purchase = self.get_object()
        data = request.data
        new_status = data.get('status', '').upper()
        warehouse_id = data.get('warehouse')
        
        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Update warehouse if provided
        if warehouse_id:
            from modules.inventory.models import Warehouse
            try:
                purchase.warehouse = Warehouse.objects.get(id=warehouse_id)
            except Warehouse.DoesNotExist:
                return Response({"error": "Selected warehouse does not exist"}, status=400)

        # Sync if newly received
        if new_status == 'RECEIVED' and not purchase.is_inventory_synced:
            # We must save the warehouse change BEFORE sync
            purchase.status = new_status
            purchase.save()
            
            success, msg = self._sync_to_inventory(purchase)
            if not success:
                return Response({"error": f"Internal fulfillment error: {msg}"}, status=500)
        else:
            purchase.status = new_status
            purchase.save()

        return Response(PurchaseOrderSerializer(purchase).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def accept_payment(self, request, pk=None):
        purchase = self.get_object()
        user = request.user
        if not user.is_staff:
            supplier_id = getattr(user, 'real_id', None)
            if not supplier_id or purchase.supplier_id != supplier_id:
                return Response({"error": "Not authorized to confirm this payment"}, status=status.HTTP_403_FORBIDDEN)
        
        purchase.payment_confirmed = True
        # Resolve the status from the actual amount paid so partial vs full is always correct.
        paid = purchase.paid_amount or 0
        total = purchase.total_amount or 0
        if total > 0 and paid >= total:
            purchase.payment_status = 'PAID'
        elif paid > 0:
            purchase.payment_status = 'PARTIAL'
        else:
            # Cash-on-confirm with no recorded amount → treat as settled (legacy behaviour).
            purchase.payment_status = 'PAID'
        purchase.save()

        # Ledger: supplier accepted the payment → record it as an expense (money out).
        try:
            from modules.payments import services
            services.record_purchase_payment(purchase)
        except Exception as e:
            print(f"Ledger error (accept_payment): {e}")

        return Response({"message": "Payment verified and accepted", "status": purchase.payment_status})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject_payment(self, request, pk=None):
        purchase = self.get_object()
        user = request.user
        if not user.is_staff:
            supplier_id = getattr(user, 'real_id', None)
            if not supplier_id or purchase.supplier_id != supplier_id:
                return Response({"error": "Not authorized to reject this payment"}, status=status.HTTP_403_FORBIDDEN)
        
        reason = request.data.get('reason', 'Payment evidence rejected by supplier')
        purchase.payment_confirmed = False
        purchase.payment_notes = (purchase.payment_notes or "") + f"\n[SUPPLIER REJECTION]: {reason}"
        purchase.save()

        # Ledger: payment was rejected → reverse any expense entry recorded for it.
        try:
            from modules.payments import services
            services.remove_purchase_payment(purchase)
        except Exception as e:
            print(f"Ledger error (reject_payment): {e}")

        return Response({"message": "Payment rejected", "payment_confirmed": False})

    @action(detail=False, methods=['post'], url_path='create')
    def create_purchase(self, request):
        from decimal import Decimal
        from django.db import IntegrityError, transaction
        from django.utils import timezone
        
        try:
            data = request.data.copy()
            items_data = data.pop('items', [])
            
            # 1. Validation: Ensure we have a supplier and items
            supplier_id = data.get('supplier') or data.get('supplier_id')
            if not supplier_id:
                return Response({"error": "Supplier is required"}, status=400)
            
            if not items_data:
                return Response({"error": "At least one item is required"}, status=400)
            
            # 2. Normalize Header Data
            # Remove helper fields from frontend that shouldn't go to model
            for helper_field in ['supplier_name', 'order_date']:
                data.pop(helper_field, None)
            
            # Normalize Enums
            if 'status' in data and data['status']:
                s = str(data['status']).upper()
                if s == 'ORDERED': s = 'PENDING'
                data['status'] = s
            else:
                data['status'] = 'PENDING'
            
            if 'payment_status' in data and data['payment_status']:
                data['payment_status'] = str(data['payment_status']).upper()
            
            if 'payment_method' in data and data['payment_method']:
                data['payment_method'] = str(data['payment_method']).upper()
            
            # Map IDs and sanitize empty strings
            if supplier_id and str(supplier_id).strip():
                data['supplier_id'] = supplier_id
            
            warehouse_id = data.get('warehouse') or data.get('warehouse_id')
            if warehouse_id and str(warehouse_id).strip():
                data['warehouse_id'] = warehouse_id
            else:
                data.pop('warehouse_id', None) 
                data.pop('warehouse', None)

            # Date Sanitization
            for date_field in ['expected_delivery_date', 'payment_date']:
                if date_field in data:
                    val = str(data[date_field]).strip()
                    data[date_field] = val if val else None

            # Numeric Sanitization
            for num_field in ['paid_amount', 'shipping_cost', 'tax_amount', 'total_amount']:
                if num_field in data:
                    try:
                        val = str(data[num_field]).strip()
                        data[num_field] = Decimal(val) if val else Decimal('0.00')
                    except (ValueError, TypeError, Exception):
                        data[num_field] = Decimal('0.00')

            # 3. Field Filtering
            allowed_fields = [
                'purchase_number', 'supplier_id', 'reference_number', 'warehouse_id',
                'total_amount', 'shipping_cost', 'tax_amount', 'status', 
                'payment_status', 'payment_method', 'expected_delivery_date', 'notes',
                'paid_amount', 'payment_date', 'payment_notes', 'transaction_id', 
                'payment_confirmed', 'is_inventory_synced'
            ]
            final_data = {k: v for k, v in data.items() if k in allowed_fields}

            # 4. Atomic Creation
            with transaction.atomic():
                # Check for purchase_number collision
                p_num = final_data.get('purchase_number')
                if p_num and PurchaseOrder.objects.filter(purchase_number=p_num).exists():
                    # Generate a unique one if collision happens
                    import time
                    final_data['purchase_number'] = f"PO-{int(time.time())}"

                purchase = PurchaseOrder.objects.create(**final_data)
                
                calculated_total = Decimal('0.00')
                for item in items_data:
                    p_id = item.get('product')
                    if not p_id: continue
                    
                    try:
                        price = Decimal(str(item.get('unit_price', '0')))
                        qty = int(item.get('quantity', 1))
                        items_per = int(item.get('items_per_carton', 1))
                        
                        # Fetch weight/size from SupplierProduct if not provided
                        sp_obj = SupplierProduct.objects.filter(id=p_id).first()
                        weight = item.get('weight') or (sp_obj.weight if sp_obj else '')
                        size = item.get('size') or (sp_obj.size if sp_obj else '')

                        PurchaseOrderItem.objects.create(
                            purchase_order=purchase,
                            product_id=p_id,
                            packaging_type=item.get('packaging_type', 'SINGLE'),
                            items_per_carton=items_per,
                            quantity=qty,
                            price=price,
                            weight=weight,
                            size=size,
                            selling_price=Decimal('0.00')
                        )
                        calculated_total += (Decimal(str(qty)) * price)
                    except (ValueError, TypeError):
                        continue
                    
                purchase.total_amount = calculated_total
                purchase.save()

                if str(purchase.status).upper() == 'RECEIVED':
                    success, msg = self._sync_to_inventory(purchase)
                    if not success:
                        raise Exception(f"Inventory sync failed: {msg}")
            
            return Response(PurchaseOrderSerializer(purchase).data, status=status.HTTP_201_CREATED)
            
        except IntegrityError as e:
            return Response({"error": f"Database error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SupplierDashboardViewSet(viewsets.ViewSet):
    """Dedicated ViewSet for supplier dashboard metrics"""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        user = request.user
        
        # 1. Total products uploaded by this supplier
        total_products = SupplierProduct.objects.filter(supplier=user).count()
        
        # 2. Orders from PurchaseOrder (Wholesale)
        pos = PurchaseOrder.objects.filter(supplier=user)
        pending_orders = pos.filter(status='PENDING').count()
        received_orders = pos.filter(status='RECEIVED').count()
        
        # 3. Total order value (Sum of successfully delivered/received POs)
        total_value = pos.filter(status__in=['RECEIVED', 'DELIVERED']).aggregate(total=Sum('total_amount'))['total'] or 0

        data = {
            "total_products": total_products,
            "pending_orders": pending_orders,
            "received_orders": received_orders,
            "total_order_value": total_value,
            "supplier_name": user.username
        }

        serializer = OrderStatsSerializer(data)
        return Response(serializer.data)


class PurchaseReturnViewSet(viewsets.ModelViewSet):
    """ViewSet for purchase returns with supplier response workflow"""
    serializer_class = PurchaseReturnSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = PurchaseReturn.objects.all()
        
        # 1. Base Filter (Staff vs Supplier)
        if user.is_staff:
            pass
        elif hasattr(user, 'is_supplier') and user.is_supplier:
            qs = qs.filter(supplier_id=user.real_id)
        else:
            return PurchaseReturn.objects.none()

        # 2. Query Param Filters
        status_param = self.request.query_params.get('status')
        search_param = self.request.query_params.get('search')

        if status_param and status_param.lower() != 'all':
            qs = qs.filter(status=status_param.upper())
        
        if search_param:
            from django.db.models import Q
            qs = qs.filter(
                Q(return_number__icontains=search_param) |
                Q(reason__icontains=search_param) |
                Q(purchase_order__purchase_number__icontains=search_param)
            ).distinct()

        return qs.order_by('-created_at')

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    @action(detail=False, methods=['post'], url_path='create')
    def create_return(self, request):
        from decimal import Decimal
        from modules.users.models import UserActivityLog
        try:
            data = request.data.copy()
            items_data = data.pop('items', [])
            
            # Map supplier name to ID if needed (for frontend compatibility)
            supplier_id = data.pop('supplier_id', data.pop('supplier', None))
            if not supplier_id and data.get('supplier_name'):
                from modules.supplier.models import Supplier
                s = Supplier.objects.filter(models.Q(name=data['supplier_name']) | models.Q(company=data['supplier_name'])).first()
                if s: supplier_id = s.id

            po_id = data.pop('purchase_order', None)
            
            # Remove non-model fields
            data.pop('supplier_name', None)
            
            allowed_fields = ['status', 'reason', 'return_date', 'total_refund_amount']
            final_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            # Explicitly set Foreign Keys and Handle Empty Strings
            final_data['supplier_id'] = supplier_id if supplier_id and str(supplier_id).strip() else None
            final_data['purchase_order_id'] = po_id if po_id and str(po_id).strip() else None
            
            ret = PurchaseReturn.objects.create(**final_data)
            
            total = Decimal('0.00')
            for it in items_data:
                if not it.get('product'): continue
                
                p_item = PurchaseReturnItem.objects.create(
                    purchase_return=ret,
                    product_id=it.get('product'),
                    quantity=int(it.get('quantity', 1)),
                    refund_price=Decimal(str(it.get('refund_price', '0')))
                )
                total += (Decimal(str(p_item.quantity)) * p_item.refund_price)
            
            ret.total_refund_amount = total
            ret.save()
            
            # Log Activity for Supplier notification
            try:
                from modules.users.models import User
                # Find the user account linked to this supplier
                sup_user = User.objects.filter(role__name__icontains='supplier', username=ret.supplier.username).first()
                if sup_user:
                    UserActivityLog.objects.create(
                        user=sup_user,
                        action='other',
                        description=f"New Return Request RECEIVED: {ret.return_number} from Admin. [ID: {ret.id}] Reason: {ret.reason or 'Not specified'}",
                        ip_address=request.META.get('REMOTE_ADDR')
                    )
            except: pass

            return Response(PurchaseReturnSerializer(ret).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='accept')
    def accept_return(self, request, pk=None):
        """Supplier accepts the return -> Adjust stocks"""
        ret = self.get_object()
        if ret.status.upper() not in ['WAITING_FOR_SUPPLIER', 'PENDING']:
            return Response({"error": "Only pending returns can be accepted"}, status=400)
            
        from django.db import transaction
        from django.db.models import F
        from modules.inventory.models import Stock
        from modules.products.models import SupplierProduct, Product
        from modules.users.models import UserActivityLog
        from modules.users.models import UserActivityLog
        
        try:
            with transaction.atomic():
                for item in ret.items.all():
                    sp = item.product
                    if not sp: continue
                    
                    # 1. Deduct from Admin Stock (Matching by product name)
                    Stock.objects.filter(product_name=sp.name, supplier=ret.supplier).update(
                        total_quantity=F('total_quantity') - item.quantity
                    )
                    
                    # 1b. Deduct from Admin Product Catalog to sync Admin UI
                    Product.objects.filter(product_name=sp.name, supplier=ret.supplier).update(
                        total_quantity=F('total_quantity') - item.quantity
                    )
                    
                    # 2. Add back to Supplier Product stock
                    sp.quantity = F('quantity') + item.quantity
                    sp.save()
                
                ret.status = 'ACCEPTED'

                ret.save()

                # Ledger: refund received from supplier → record as income (money in).
                try:
                    from modules.payments import services
                    services.record_purchase_return(ret)
                except Exception as e:
                    print(f"Ledger error (accept_return): {e}")

                from modules.users.models import UserActivityLog

                # Check for shadow user (suppliers usually don't exist in User table)
                log_user = request.user
                if getattr(log_user, 'is_supplier', False):
                    log_user = None
                    
                # Log Success Activity
                UserActivityLog.objects.create(
                    user=log_user,
                    action='update',
                    description=f"Supplier {ret.supplier.name} ACCEPTED Return {ret.return_number}. Stocks adjusted.",
                    ip_address=request.META.get('REMOTE_ADDR')
                )
                
            return Response(PurchaseReturnSerializer(ret).data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_return(self, request, pk=None):
        ret = self.get_object()
        if ret.status.upper() not in ['WAITING_FOR_SUPPLIER', 'PENDING']:
            return Response({"error": "Only pending returns can be rejected"}, status=400)
            
        ret.status = 'REJECTED'
        ret.save()
        
        
        # Check for shadow user
        from modules.users.models import UserActivityLog
        log_user = request.user
        if getattr(log_user, 'is_supplier', False):
            log_user = None

        UserActivityLog.objects.create(
            user=log_user,
            action='update',
            description=f"Supplier {ret.supplier.name} REJECTED Return {ret.return_number}.",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response(PurchaseReturnSerializer(ret).data)
