from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import models
from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from .models import Order, OrderItem, PurchaseOrder, PurchaseOrderItem, PurchaseReturn, PurchaseReturnItem
from .serializers import OrderSerializer, CreateOrderSerializer, PurchaseOrderSerializer, PurchaseReturnSerializer, OrderStatsSerializer
from modules.products.models import SupplierProduct

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrderSerializer
        return OrderSerializer

    def get_permissions(self):
        if self.action in ['create', 'track', 'stats']:
            return [permissions.AllowAny()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            queryset = Order.objects.all()
        elif user.is_authenticated:
            queryset = Order.objects.filter(user=user)
        else:
            return Order.objects.none()
        
        # 2. Query Param Filters (Applied to all)
        status_filter = self.request.query_params.get('status')
        date_filter = self.request.query_params.get('date')
        exclude_status = self.request.query_params.get('exclude_status')
        search = self.request.query_params.get('search')
        
        if status_filter and status_filter != 'All':
            queryset = queryset.filter(status=status_filter.upper())
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

        return queryset.order_by('-created_at')

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

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        if order.status == 'DELIVERED':
            return Response({"error": "Delivered orders are locked and cannot be modified."}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        if order.status == 'DELIVERED':
            return Response({"error": "Delivered orders are locked and cannot be modified."}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAdminUser])
    def update_status(self, request, pk=None):
        order = self.get_object()
        
        # 1. Check if already delivered (Lock)
        if order.status == 'DELIVERED':
            return Response({"error": "Order is already delivered and locked."}, status=status.HTTP_400_BAD_REQUEST)
            
        new_status = request.data.get('status', '').upper()
        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. Inventory Deduction Logic
        if new_status == 'DELIVERED':
            try:
                from django.db import transaction
                with transaction.atomic():
                    for item in order.items.all():
                        if item.product and item.product.stock:
                            stock = item.product.stock
                            # Deduct from Stock entry
                            stock.total_quantity = F('total_quantity') - item.quantity
                            stock.save()
                            
                            # Deduct from Product snapshot field (if it exists and is used)
                            product = item.product
                            product.total_quantity = F('total_quantity') - item.quantity
                            product.save()
            except Exception as e:
                return Response({"error": f"Inventory deduction failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 3. Save new status
        order.status = new_status
        order.save()
        return Response(OrderSerializer(order).data)
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
            
        # Base queryset with filters
        stat_qs = Order.objects.all()
        if date_filter:
            stat_qs = stat_qs.filter(created_at__date=today)
        if payment_method and payment_method != 'ALL':
            stat_qs = stat_qs.filter(payment_method=payment_method.upper())

        total_orders = stat_qs.count()
        pending_orders = stat_qs.filter(status='PENDING').count()
        delivered_orders_qs = stat_qs.filter(status='DELIVERED')
        delivered_count = delivered_orders_qs.count()
        
        # Revenue Logic: Only Delivered orders count as revenue
        total_revenue = delivered_orders_qs.aggregate(tot=Sum('total_amount'))['tot'] or 0

        # Profit Logic: (Item Price - Item Cost) * Quantity for delivered orders
        items = OrderItem.objects.filter(order__in=delivered_orders_qs)
        total_profit = items.annotate(
            item_profit=ExpressionWrapper(
                (F('price') - F('cost_price')) * F('quantity'),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            )
        ).aggregate(tot=Sum('item_profit'))['tot'] or 0
        
        # Accounts Payable: Sum of remaining balance on all active Purchase Orders
        # Condition: PO is not Cancelled
        total_payable = PurchaseOrder.objects.exclude(status='CANCELLED').annotate(
            balance=ExpressionWrapper(
                F('total_amount') - F('paid_amount'),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            )
        ).aggregate(tot=Sum('balance'))['tot'] or 0

        # Recent Orders (Top 10)
        recent_orders_qs = stat_qs.order_by('-created_at')[:10]
        recent_orders = OrderSerializer(recent_orders_qs, many=True).data

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
                "purchases": 0
            })

        return Response({
            "total_orders": total_orders,
            "total_revenue": float(total_revenue),
            "total_profit": float(total_profit),
            "total_payable": float(total_payable),
            "orders_today": Order.objects.filter(created_at__date=timezone.now().date()).count(),
            "pending_orders": pending_orders,
            "delivered_orders": delivered_count,
            "recent_orders": recent_orders,
            "revenue_history": history,
            "top_products": [],
            "recent_purchases": []
        })


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

    def _sync_to_inventory(self, purchase):
        """Helper to sync PO items to Admin inventory and deduct from Supplier"""
        from django.db import transaction
        from django.db.models import F
        from modules.products.models import Product, SupplierProduct
        from modules.inventory.models import Stock, Warehouse
        from django.utils import timezone
        from decimal import Decimal

        try:
            # Explicitly check for warehouse to avoid IntegrityError
            warehouse = purchase.warehouse
            if not warehouse:
                warehouse = Warehouse.objects.first()
                if not warehouse:
                    return False, "No active warehouse defined in the system."
                purchase.warehouse = warehouse
                purchase.save()

            with transaction.atomic():
                for item in purchase.items.all():
                    sp = item.product
                    if not sp: continue
                    
                    units = item.total_units
                    
                    # 1. Deduct from Supplier available units
                    sp.quantity = F('quantity') - units
                    sp.save()
                    
                    # 2. Locate or Update Stock entry (Strict Duplicate Prevention)
                    # We match by product_name only to ensure "Only one product entry should remain in stock"
                    stock = Stock.objects.filter(product_name=sp.name).first()

                    if stock:
                        # Update existing stock entry: add quantity, overwrite others with latest info
                        stock.total_quantity = F('total_quantity') + units
                        stock.price_per_item = item.price
                        stock.supplier = purchase.supplier
                        stock.warehouse = warehouse
                        stock.category = sp.category
                        stock.product = sp # Link back to supplier product
                        stock.date = timezone.now().date()
                        stock.save()
                    else:
                        # Create new Stock record if none exists
                        Stock.objects.create(
                            product_name=sp.name,
                            product=sp, # Link back to supplier product
                            category=sp.category,
                            supplier=purchase.supplier,
                            warehouse=warehouse,
                            purchase_type='single',
                            total_quantity=units,
                            price_per_item=item.price,
                            date=timezone.now().date()
                        )
            # Finalize sync
            purchase.is_inventory_synced = True
            purchase.save()
            return True, ""
        except Exception as e:
            import traceback
            print(f"CRITICAL SYNC ERROR: {str(e)}")
            print(traceback.format_exc())
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
        new_status = request.data.get('status', '').upper()
        
        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Sync if newly received
        if new_status == 'RECEIVED' and not purchase.is_inventory_synced:
            success, msg = self._sync_to_inventory(purchase)
            if not success:
                return Response({"error": f"Internal fulfillment error: {msg}"}, status=500)

        purchase.status = new_status
        purchase.save()
        return Response(PurchaseOrderSerializer(purchase).data)

    @action(detail=False, methods=['post'], url_path='create')
    def create_purchase(self, request):
        from decimal import Decimal
        try:
            data = request.data.copy()
            items_data = data.pop('items', [])
            
            # 1. Normalize data - Remove non-model fields that cause crashes
            data.pop('supplier_name', None)
            
            # Normalize Enums to UPPERCASE matching model choices
            if 'status' in data:
                s = data['status'].upper()
                if s == 'ORDERED': s = 'PENDING'
                data['status'] = s
            
            if 'payment_status' in data:
                data['payment_status'] = data['payment_status'].upper()
            if 'payment_method' in data:
                data['payment_method'] = str(data['payment_method']).upper()
            
            # Map IDs correctly and handle empty strings
            supplier_id = data.pop('supplier', None)
            if supplier_id and str(supplier_id).strip():
                data['supplier_id'] = supplier_id
            
            warehouse_id = data.pop('warehouse', None)
            if warehouse_id and str(warehouse_id).strip():
                data['warehouse_id'] = warehouse_id
                
            # 2. Create Purchase Order

            # Only include fields that actually exist in the model to avoid Keyword Argument errors
            allowed_fields = [
                'purchase_number', 'supplier_id', 'reference_number', 'warehouse_id',
                'total_amount', 'shipping_cost', 'tax_amount', 'status', 
                'payment_status', 'payment_method', 'expected_delivery_date', 'notes',
                'paid_amount', 'payment_date', 'payment_notes', 'transaction_id', 
                'payment_confirmed', 'is_inventory_synced'
            ]
            final_data = {k: v for k, v in data.items() if k in allowed_fields}

            purchase = PurchaseOrder.objects.create(**final_data)
            
            total_amount = Decimal('0.00')
            for item in items_data:
                price = Decimal(str(item.get('unit_price', '0')))
                s_price = Decimal(str(item.get('selling_price', '0')))
                
                p_item = PurchaseOrderItem.objects.create(
                    purchase_order=purchase,
                    product_id=item.get('product'),
                    packaging_type=item.get('packaging_type', 'SINGLE'),
                    items_per_carton=int(item.get('items_per_carton', 1)),
                    quantity=int(item.get('quantity', 1)),
                    price=price,
                    selling_price=s_price
                )
                total_amount += (Decimal(str(p_item.quantity)) * price)
                
            purchase.total_amount = total_amount
            purchase.save()

            if purchase.status.upper() == 'RECEIVED':
                self._sync_to_inventory(purchase)
            
            return Response(PurchaseOrderSerializer(purchase).data, status=status.HTTP_201_CREATED)
        except Exception as e:
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
        
        if user.is_staff:
            pass
        elif hasattr(user, 'is_supplier') and user.is_supplier:
            qs = qs.filter(supplier_id=user.real_id)
        else:
            return PurchaseReturn.objects.none()

        return qs.order_by('-created_at')

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
        if ret.status != 'WAITING_FOR_SUPPLIER':
            return Response({"error": "Only pending returns can be accepted"}, status=400)
            
        from django.db import transaction
        from django.db.models import F
        from modules.inventory.models import Stock
        from modules.products.models import SupplierProduct
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
                    
                    # 2. Add back to Supplier Product stock
                    sp.quantity = F('quantity') + item.quantity
                    sp.save()
                
                ret.status = 'ACCEPTED'
                ret.save()
                
                # Log Success Activity
                UserActivityLog.objects.create(
                    user=request.user,
                    action='update',
                    description=f"Return {ret.return_number} ACCEPTED. Stocks adjusted.",
                    ip_address=request.META.get('REMOTE_ADDR')
                )
                
            return Response(PurchaseReturnSerializer(ret).data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_return(self, request, pk=None):
        ret = self.get_object()
        if ret.status != 'WAITING_FOR_SUPPLIER':
            return Response({"error": "Only pending returns can be rejected"}, status=400)
            
        ret.status = 'REJECTED'
        ret.save()
        
        from modules.users.models import UserActivityLog
        UserActivityLog.objects.create(
            user=request.user,
            action='update',
            description=f"Return {ret.return_number} REJECTED by supplier.",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        
        return Response(PurchaseReturnSerializer(ret).data)
