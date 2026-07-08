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
from core.permissions import HasModulePermission
from core.scoping import (
    BranchScopedQuerysetMixin, scope_queryset, user_warehouse_ids,
    user_can_use_warehouse, scope_to_tenant, tenant_id_for,
)


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


def complete_delivery_stock(order):
    """Finalize a delivery from the RIDER path: release any reservation, deduct
    physical stock from the order's own branch (tenant-scoped), settle fully-paid
    balances, and log the purchase. POS sales assigned to a rider ship as SHIPPED
    (which only RESERVES stock); when the rider marks DELIVERED this deducts it.

    ``order.status`` must already be DELIVERED before calling — the final save fires
    the sale→ledger signal that books the income.
    """
    from django.db import transaction
    from django.db.models import F, Value
    from django.db.models.functions import Greatest
    from django.utils import timezone
    from modules.inventory.models import Stock
    from modules.payments.services import has_confirmed_installments
    from .models import CustomerBoughtProduct

    warehouse_id = order.warehouse_id
    with transaction.atomic():
        for item in order.items.all():
            if not item.product:
                continue
            if order.is_reserved:
                # Release the reservation (never below zero).
                item.product.reserved_quantity = Greatest(F('reserved_quantity') - item.quantity, Value(0))
                item.product.save()
            if warehouse_id:
                # Identity is NAME + warehouse (+ tenant) only — NOT weight/size — so a
                # Stock row whose weight/size drifted from the Product's is still found
                # and deducted (matches the storefront quantity + sync-signal identity).
                sf = dict(
                    product_name__iexact=item.product.product_name,
                    warehouse_id=warehouse_id,
                )
                if getattr(order, 'tenant_id', None):
                    sf['tenant_id'] = order.tenant_id
                stock = Stock.objects.filter(**sf).order_by('-total_quantity').first()
                if stock:
                    # Deduct physical stock, clamped at zero (no negative stock).
                    stock.total_quantity = Greatest(F('total_quantity') - item.quantity, Value(0))
                    stock.save()
                    if hasattr(stock, 'product') and stock.product:
                        stock.product.quantity = Greatest(F('quantity') - item.quantity, Value(0))
                        stock.product.save()
            item.product.save()
            CustomerBoughtProduct.objects.get_or_create(
                order=order, product=item.product,
                defaults={'customer': order.customer, 'user': order.user,
                          'quantity': item.quantity, 'price': item.price},
            )
        if (str(order.payment_status).upper() == 'PAID'
                and not has_confirmed_installments('order', order.id)):
            order.amount_paid = order.total_amount
        order.is_reserved = False
        if not order.delivered_at:
            order.delivered_at = timezone.now()
        order.save()


class OrderViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Order.objects.all()
    permission_classes = [HasModulePermission]
    perm_module = 'sales'
    branch_field = 'warehouse'
    # Tenant (owning-Admin) isolation is THE primary axis.
    tenant_field = 'tenant'
    shadow_safe = True  # get_queryset already limits customer/supplier to their own slice
    # Branch admins see only the sales they personally created.
    creator_field = 'created_by'

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrderSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        """Stamp + enforce the branch for staff-created (POS) sales. Storefront /
        customer order routing to the chosen branch's admin is handled in the
        CreateOrderSerializer (which owns tenant/warehouse stamping)."""
        from rest_framework.exceptions import PermissionDenied
        actor = self.request.user
        if getattr(actor, 'is_authenticated', False) and getattr(actor, 'is_staff', False):
            ids = user_warehouse_ids(actor)
            if ids is not None:  # a branch-scoped admin
                wh_id = (serializer.validated_data.get('warehouse_id') or '').strip()
                if not wh_id:
                    # Auto-use the only branch they manage; require a choice otherwise.
                    if len(ids) == 1:
                        serializer.validated_data['warehouse_id'] = next(iter(ids))
                    else:
                        raise PermissionDenied('Select your branch warehouse to record this sale.')
                elif not user_can_use_warehouse(actor, wh_id):
                    raise PermissionDenied('You cannot sell from a branch you are not assigned to.')
        serializer.save()

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

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
            # Return any still-reserved stock before deleting, so a reserved order
            # that never delivered doesn't permanently leak reserved_quantity.
            if getattr(instance, 'is_reserved', False):
                from django.db.models import F, Value
                from django.db.models.functions import Greatest
                for item in instance.items.all():
                    if item.product:
                        item.product.reserved_quantity = Greatest(F('reserved_quantity') - item.quantity, Value(0))
                        item.product.save()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": f"Deletion failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def set_due_date(self, request, pk=None):
        """Set/clear the payment due date for a sale.

        Allowed even on DELIVERED orders (which are otherwise locked) because the
        balance can still be outstanding and need a deadline.
        """
        order = self.get_object()
        due = request.data.get('due_date')
        order.due_date = due or None
        order.save(update_fields=['due_date'])
        return Response({'id': str(order.id), 'due_date': order.due_date})

    def _resolve_delivery_warehouse(self, order, request):
        """Resolve the branch (warehouse) a delivery is fulfilled from.

        Branch isolation: a branch admin always delivers from THEIR OWN assigned
        branch — the warehouse is auto-selected from the logged-in admin, never a
        manual cross-branch choice. The platform operator (super admin) may pick
        any branch. Returns ``(warehouse_id, error_response)``; on success the
        error is None, on failure the warehouse_id is None.
        """
        actor = request.user
        order_wh = str(getattr(order, 'warehouse_id', '') or '')
        req_wh = str(request.data.get('warehouse_id') or '')
        ids = user_warehouse_ids(actor)  # None -> unscoped (super admin / superuser)

        if ids is not None:
            # Branch-scoped admin: lock the fulfillment to a branch they manage.
            if not ids:
                return None, Response(
                    {"error": "No branch is assigned to your account."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # An order already tied to a branch must be one this admin owns.
            if order_wh and order_wh not in ids:
                return None, Response(
                    {"error": "This order belongs to another branch — you cannot deliver it."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if order_wh:
                return order_wh, None
            # No branch on the order yet: auto-use their single branch; if they
            # manage several, require a valid choice among their own.
            if len(ids) == 1:
                return next(iter(ids)), None
            if req_wh and req_wh in ids:
                return req_wh, None
            return None, Response(
                {"error": "Select your branch warehouse to complete this delivery."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Unscoped operator: prefer the order's own branch, else the chosen one.
        wh = order_wh or req_wh
        if not wh:
            return None, Response(
                {"error": "Warehouse selection is required for delivery."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return wh, None

    @action(detail=True, methods=['patch'])
    def assign_delivery(self, request, pk=None):
        """Assign (or clear) the delivery rider for an order, and optionally set the
        rider's payout (delivery_fee) for this delivery."""
        order = self.get_object()
        rider_id = request.data.get('delivery_person')
        order.delivery_person_id = rider_id or None
        update_fields = ['delivery_person']
        if 'delivery_fee' in request.data:
            from decimal import Decimal, InvalidOperation
            try:
                order.delivery_fee = Decimal(str(request.data.get('delivery_fee') or 0))
                update_fields.append('delivery_fee')
            except (InvalidOperation, TypeError, ValueError):
                pass
        order.save(update_fields=update_fields)
        return Response(OrderSerializer(order, context={'request': request}).data)

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
                # Suppliers must NOT see the admin's sales orders / customers —
                # their portal is limited to their own purchase orders & returns.
                queryset = Order.objects.none()
            else:
                queryset = Order.objects.filter(user=user)

        # Area Manager scoping: only orders whose customer is in their area(s).
        from core.scoping import user_area_ids
        area_ids = user_area_ids(user)
        if area_ids is not None:
            queryset = queryset.filter(customer__area_id__in=area_ids)

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

        # Tenant isolation: lock to the requester's owning Admin (no-op for the
        # platform operator, supplier/customer shadow logins, and anonymous).
        queryset = scope_to_tenant(user, queryset, 'tenant')

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
        # Delegate to the canonical tracker (track_order_by_id) so the public
        # ?tid= entry point and the /track/<id>/ entry point return an identical
        # payload — one source of truth, no drift, with UUID fallback for free.
        return track_order_by_id(request, tracking_id)

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
            # Suppliers must NOT see the admin's sales orders / customers.
            queryset = Order.objects.none()
        else:
            queryset = Order.objects.filter(user=user)

        # Tenant isolation (no-op for customer/supplier shadow logins & anon).
        queryset = scope_to_tenant(user, queryset, 'tenant')

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
            
        # Per-admin bases: a branch admin's dashboard counts only the sales/purchases
        # THEY created; super admin sees everything (with optional ?created_by /
        # ?warehouse drill-down).
        from core.scoping import scope_queryset, apply_report_scope
        orders = apply_report_scope(request, Order.objects.all(), 'warehouse', 'created_by', tenant_field='tenant')
        purchase_orders = apply_report_scope(request, PurchaseOrder.objects.all(), 'warehouse', 'created_by', tenant_field='tenant')

        # Branch-scoped low stock — computed from THIS branch's Stock rows vs each
        # product's min_count, so a branch admin sees their own shortages (an item
        # full in branch A but empty in branch B is still low for B). Shared helper
        # also powers the GET /v1/inventory/stocks/low_stock/ endpoint.
        from modules.inventory.views import compute_low_stock
        low_stock = compute_low_stock(request.user, request.query_params.get('warehouse'))

        # Base queryset WITH date/payment filters
        filtered_qs = orders
        if date_filter:
            filtered_qs = filtered_qs.filter(created_at__date=today)
        if payment_method and payment_method != 'ALL':
            filtered_qs = filtered_qs.filter(payment_method=payment_method.upper())

        # Metrics
        total_orders_filtered = filtered_qs.count()
        delivered_orders_qs = filtered_qs.filter(status='DELIVERED')
        delivered_count_filtered = delivered_orders_qs.count()

        # System-Wide Totals (within the user's branch scope)
        total_pending = orders.filter(status='PENDING').count()
        total_active_all = orders.exclude(status__in=['DELIVERED', 'CANCELLED']).count()
        system_total_orders = orders.count()

        # Revenue Logic: Only Delivered orders count as revenue
        total_revenue = delivered_orders_qs.aggregate(tot=Sum('total_amount'))['tot'] or 0

        # Profit Logic — gross margin on delivered items, NET of items that were
        # returned via accepted sale returns (a returned unit reverses its margin).
        from .models import OrderItem, SaleReturnItem
        from decimal import Decimal as _D
        items = OrderItem.objects.filter(order__in=delivered_orders_qs)
        gross_profit = items.annotate(
            item_profit=ExpressionWrapper(
                (F('price') - F('cost_price')) * F('quantity'),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            )
        ).aggregate(tot=Sum('item_profit'))['tot'] or 0
        # Cost basis per (order, product) from the original sale lines.
        cost_map = {
            (oi['order_id'], oi['product_id']): (oi['price'], oi['cost_price'])
            for oi in items.values('order_id', 'product_id', 'price', 'cost_price')
        }
        returned_profit = _D('0')
        ret_items = SaleReturnItem.objects.filter(
            sale_return__order__in=delivered_orders_qs,
            sale_return__status='ACCEPTED',
        ).values('sale_return__order_id', 'product_id', 'quantity', 'price')
        for ri in ret_items:
            sell, cost = cost_map.get(
                (ri['sale_return__order_id'], ri['product_id']), (ri['price'], 0)
            )
            returned_profit += (_D(str(sell)) - _D(str(cost))) * (ri['quantity'] or 0)
        total_profit = _D(str(gross_profit)) - returned_profit

        # Accounts Payable: Sum of remaining balance on all active Purchase Orders
        total_payable = purchase_orders.exclude(status='CANCELLED').annotate(
            balance=ExpressionWrapper(
                F('total_amount') - F('paid_amount'),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            )
        ).aggregate(tot=Sum('balance'))['tot'] or 0

        # Recent Orders for Dashboard
        recent_orders_qs = orders.order_by('-created_at')[:50]
        recent_orders = OrderSerializer(recent_orders_qs, many=True, context={'request': request}).data

        # Revenue history for graph (last 7 days)
        history = []
        for i in range(6, -1, -1):
            d = today - timezone.timedelta(days=i)
            day_qs = orders.filter(created_at__date=d, status='DELIVERED')
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
            "orders_today": orders.filter(created_at__date=timezone.now().date()).count(),
            "pending_orders": total_pending,
            "total_active": total_active_all,
            "delivered_orders": delivered_count_filtered,
            "recent_orders": recent_orders,
            "revenue_history": history,
            "top_products": [],
            "recent_purchases": [],
            "low_stock": low_stock,
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
                    # Branch isolation: auto-resolve the fulfillment branch from the
                    # logged-in branch admin (never another branch's stock).
                    warehouse_id, wh_error = self._resolve_delivery_warehouse(order, request)
                    if wh_error is not None:
                        return wh_error
                    # Persist the resolved branch so the payment ledger (recorded by
                    # the post_save signal when status hits DELIVERED) lands in THIS
                    # branch's accounts even when the order had no branch set.
                    order.warehouse_id = warehouse_id

                    from modules.inventory.models import Stock
                    from django.db.models import Value
                    from django.db.models.functions import Greatest
                    for item in order.items.all():
                        if item.product:
                            # Release Reserved first if it was reserved (never below 0)
                            if order.is_reserved:
                                item.product.reserved_quantity = Greatest(F("reserved_quantity") - item.quantity, Value(0))
                                item.product.save()

                            # Actual Deduction from Physical Stock (Master Stock Table).
                            # Scope to THIS branch and, when the order is owned by a
                            # tenant, to that tenant — so a delivery can only ever
                            # deplete the current branch's own stock.
                            stock_filter = dict(
                                product_name__iexact=item.product.product_name,
                                weight=item.product.weight,
                                size=item.product.size,
                                warehouse_id=warehouse_id,
                            )
                            if getattr(order, 'tenant_id', None):
                                stock_filter['tenant_id'] = order.tenant_id
                            stock = Stock.objects.filter(**stock_filter).first()

                            if stock:
                                # Clamp at zero so a delivery can never drive stock negative.
                                stock.total_quantity = Greatest(F("total_quantity") - item.quantity, Value(0))
                                stock.save()

                                # Update Linked Supplier Product quantity if exists
                                if hasattr(stock, "product") and stock.product:
                                    sp_prod = stock.product
                                    sp_prod.quantity = Greatest(F("quantity") - item.quantity, Value(0))
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
                    # Payment is collected at delivery for fully-paid (cash/COD)
                    # sales: settle the balance so it's recorded directly in the
                    # branch accounts and no manual "Collect" step is needed.
                    # Genuine credit sales (explicitly UNPAID/PARTIAL) keep their
                    # outstanding balance so they can still be collected later.
                    from modules.payments.services import has_confirmed_installments
                    if (str(order.payment_status).upper() == 'PAID'
                            and not has_confirmed_installments('order', order.id)):
                        order.amount_paid = order.total_amount

                    order.is_reserved = False
                    order.delivered_at = timezone.now()
                    order.save()

                # 3. RELEASE RESERVED on Cancellation or Rejection
                release_statuses = ["CANCELLED", "REJECTED"]
                if new_status in release_statuses and order.is_reserved:
                    from django.db.models import Value
                    from django.db.models.functions import Greatest
                    for item in order.items.all():
                        if item.product:
                            item.product.reserved_quantity = Greatest(F("reserved_quantity") - item.quantity, Value(0))
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
            order = scope_to_tenant(request.user, Order.objects.all(), 'tenant').get(pk=pk)
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


class SaleReturnViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = SaleReturn.objects.all()
    serializer_class = SaleReturnSerializer
    perm_module = 'sales'
    # Tenant isolation through the SaleReturn's own tenant column.
    tenant_field = 'tenant'
    shadow_safe = True  # get_queryset limits a customer to their own returns
    # Scope through the originating sale's branch.
    branch_field = 'order__warehouse'
    # Branch admins see only returns against sales they created.
    creator_field = 'order__created_by'

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser(), HasModulePermission()]
        return [permissions.IsAuthenticated(), HasModulePermission()]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_staff', False):
            return scope_to_tenant(user, SaleReturn.objects.all(), 'tenant')

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
        
        # Branch isolation: a branch admin can only file a return against an order
        # in their own branch. The helper returns True for super admins and
        # customers (unscoped), so this only blocks cross-branch admins.
        order = serializer.validated_data.get('order')
        if order is not None and not user_can_use_warehouse(user, str(getattr(order, 'warehouse_id', '') or '')):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("This order belongs to another branch — you cannot create a return for it.")

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

        # Tenant isolation: copy the owning Admin from the parent order when
        # present, else fall back to the actor's tenant (None for anon/shadow).
        _tid = getattr(order, 'tenant_id', None) if order is not None else None
        if _tid is None:
            _tid = tenant_id_for(user)

        sale_return = serializer.save(customer=customer_obj, user=user_obj, tenant_id=_tid)
        
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
            order = scope_to_tenant(request.user, Order.objects.all(), 'tenant').get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=404)

        # Branch isolation: a branch admin may only act on orders in their own
        # branch (customers aren't branch-scoped, so this only blocks admins).
        if getattr(request.user, 'is_staff', False) and not user_can_use_warehouse(request.user, str(getattr(order, 'warehouse_id', '') or '')):
            return Response({'error': 'This order belongs to another branch.'}, status=403)

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



class PurchaseViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    """ViewSet for wholesale purchase orders from distributor to supplier"""
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'purchases'
    branch_field = 'warehouse'
    # Tenant (owning-Admin) isolation is THE primary axis.
    tenant_field = 'tenant'
    shadow_safe = True  # get_queryset limits a supplier to purchase orders addressed to them
    # Branch admins see only the purchases they personally created.
    creator_field = 'created_by'

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

        # Tenant isolation (no-op for the platform operator & supplier shadow login).
        qs = scope_to_tenant(user, qs, 'tenant')

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
            if warehouse is None and purchase.created_by_id:
                # No warehouse on the PO — fall back to the creating admin's
                # assigned branch so received stock still lands somewhere sensible
                # (no picker shown to branch admins).
                warehouse = purchase.created_by.warehouses.first()

            with transaction.atomic():
                for item in purchase.items.all():
                    sp = item.product
                    if not sp: continue
                    
                    units = item.total_units
                    
                    # 1. Deduct from Supplier available units
                    sp.quantity = F('quantity') - units
                    sp.save()
                    
                    # 2. Merge into the existing stock line for this product in this
                    # branch — matched by NAME (not price, weight or size). A changed
                    # purchase cost never creates a duplicate: the quantity is added to
                    # the same line and the LATEST cost becomes the stock's cost. The
                    # matching Product is repriced too (cost + margin-kept sale price).
                    existing = Stock.objects.filter(
                        product_name__iexact=sp.name,
                        warehouse=warehouse,
                        tenant_id=purchase.tenant_id,
                    ).first()
                    if existing:
                        # Reprice the Admin Product(s) to the new cost BEFORE saving the
                        # stock, so the stock->product sum signal lands on the right row.
                        self._reprice_product(sp.name, warehouse, purchase.tenant_id, item.price)
                        existing.price_per_item = item.price   # latest cost wins
                        existing.total_quantity = F('total_quantity') + units
                        existing.save()  # fires signal → re-sums qty into Product
                        existing.refresh_from_db()
                        stock = existing
                    else:
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
                            date=timezone.now().date(),
                            # Attribute the stock to whoever created the purchase, so a
                            # branch admin sees only the stock from purchases they made.
                            created_by=purchase.created_by,
                            # Owning Admin (tenant) — inherit from the purchase order so
                            # synced stock stays inside the same tenant.
                            tenant_id=purchase.tenant_id,
                        )

                    # 3. Record the movement history
                    StockMovement.objects.create(
                        stock=stock,
                        movement_type='PURCHASE',
                        quantity=units,
                        to_warehouse=warehouse,
                        date=timezone.now().date(),
                        description=f"Purchase Order #{purchase.purchase_number} received",
                        tenant_id=purchase.tenant_id,
                    )
            
            purchase.is_inventory_synced = True
            purchase.save()
            return True, ""
        except Exception as e:
            import traceback
            print(f"CRITICAL SYNC ERROR: {str(e)}")
            return False, str(e)

    def _reprice_product(self, name, warehouse, tenant_id, new_cost):
        """Received stock at a new cost → reprice the matching Admin Product(s) in
        this branch (matched by name): cost_price becomes the latest cost, and the
        sale price moves proportionally so the profit margin is preserved
        (selling = new_cost × old_sale/old_cost). profit_margin is derived, so it
        updates automatically."""
        from decimal import Decimal
        from modules.products.models import Product
        nc = Decimal(str(new_cost or 0))
        if nc <= 0:
            return
        prods = Product.objects.filter(
            product_name__iexact=name,
            warehouse=warehouse,
            tenant_id=tenant_id,
        )
        for p in prods:
            old_cost = Decimal(str(p.cost_price or 0))
            old_sale = Decimal(str(p.selling_price or 0))
            if old_cost > 0 and old_sale > 0:
                new_sale = (nc * (old_sale / old_cost)).quantize(Decimal('0.01'))
            else:
                new_sale = old_sale
            Product.objects.filter(id=p.id).update(cost_price=nc, selling_price=new_sale)

    _PM_MAP = {'CASH': 'cash', 'BANK_TRANSFER': 'bank_transfer', 'CHEQUE': 'check',
               'ONLINE': 'mobile_wallet', 'CREDIT': 'other'}

    def _record_purchase_payment(self, purchase, old_paid):
        """Turn a purchase's paid-amount change into individual installment records
        so each payment is listed separately with its own date/time. Backfills any
        legacy directly-entered amount as one 'opening' entry the first time."""
        from decimal import Decimal
        from django.utils import timezone
        from modules.payments.models import TransactionPayment
        from modules.payments.services import confirmed_paid_total, record_installment

        new_paid = Decimal(str(purchase.paid_amount or 0))
        prior = Decimal(str(confirmed_paid_total('purchaseorder', purchase.id) or 0))

        actor = getattr(self.request, 'user', None)
        real = actor if (getattr(actor, 'pk', None) and actor.__class__.__name__ == 'User'
                         and not getattr(actor, 'is_supplier', False)
                         and not getattr(actor, 'is_customer', False)) else None
        method = self._PM_MAP.get(str(purchase.payment_method or '').upper(), 'cash')

        def _make(amount, paid_at, note):
            if amount <= 0:
                return
            tp = TransactionPayment.objects.create(
                source_type='purchaseorder', source_id=str(purchase.id),
                amount=amount, method=method, status='confirmed', direction='outbound',
                paid_at=(paid_at or timezone.now()), reference=(purchase.transaction_id or ''),
                note=note, created_by=real,
                warehouse_id=purchase.warehouse_id, tenant_id=purchase.tenant_id,
            )
            record_installment(tp)  # posts ledger + recompute_parent (keeps paid_amount correct)

        # Backfill the legacy directly-paid balance as one opening entry.
        if prior < old_paid:
            _make(old_paid - prior, getattr(purchase, 'order_date', None), 'Opening balance (recorded on order)')
            prior = old_paid
        # This save's new payment.
        _make(new_paid - prior, getattr(purchase, 'payment_date', None), 'Payment')

    def perform_update(self, serializer):
        from decimal import Decimal
        # Capture the paid amount BEFORE the update so we can tell how much of this
        # save is a NEW payment vs. what was already on the order.
        old_paid = Decimal(str(getattr(serializer.instance, 'paid_amount', 0) or 0))
        instance = serializer.save()

        # Record each purchase payment as its own installment, so the payment
        # history shows separate entries (amount + date/time + method). We keep the
        # installment sum equal to paid_amount: any pre-existing directly-entered
        # paid amount is backfilled once as an "opening" entry, then this save's
        # increment is added as its own record.
        try:
            self._record_purchase_payment(instance, old_paid)
        except Exception as e:
            print(f"purchase payment history record failed: {e}")

        # Keep payment_status authoritative from the final paid vs total (after any
        # installment recompute), so it can never disagree with the amounts.
        try:
            instance.refresh_from_db()
            _paid = Decimal(str(instance.paid_amount or 0))
            _total = Decimal(str(instance.total_amount or 0))
            _st = 'PAID' if (_paid >= _total and _total > 0) else 'PARTIAL' if _paid > 0 else 'UNPAID'
            if instance.payment_status != _st:
                instance.payment_status = _st
                instance.save(update_fields=['payment_status'])
        except Exception:
            pass

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

            # Branch scoping: auto-use the only branch a single-branch admin manages,
            # require a choice when they manage several, and reject a foreign branch.
            _ids = user_warehouse_ids(request.user)
            if _ids is not None:
                _wh = data.get('warehouse_id')
                if not _wh:
                    if len(_ids) == 1:
                        data['warehouse_id'] = next(iter(_ids))
                    else:
                        return Response({"error": "Select a branch warehouse for this purchase."}, status=400)
                elif not user_can_use_warehouse(request.user, _wh):
                    return Response({"error": "You cannot create a purchase for a branch you are not assigned to."}, status=403)

            # Date Sanitization
            for date_field in ['expected_delivery_date', 'payment_date', 'due_date']:
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
                'payment_status', 'payment_method', 'expected_delivery_date', 'due_date', 'notes',
                'paid_amount', 'payment_date', 'payment_notes', 'transaction_id',
                'payment_confirmed', 'is_inventory_synced'
            ]
            final_data = {k: v for k, v in data.items() if k in allowed_fields}

            # Record which admin/user created this PO (shown to the supplier as "From").
            if getattr(request, 'user', None) and request.user.is_authenticated:
                final_data['created_by'] = request.user

            # Tenant (owning-Admin) isolation. None for platform op / shadow logins.
            _tid = tenant_id_for(getattr(request, 'user', None))
            if _tid is not None:
                final_data['tenant_id'] = _tid

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
                        # Carton purchases cost (cartons × pcs-per-carton × per-piece price);
                        # single purchases cost (qty × price). price is always per-piece.
                        total_units = qty * items_per if item.get('packaging_type', 'SINGLE') == 'CARTON' else qty
                        calculated_total += (Decimal(str(total_units)) * price)
                    except (ValueError, TypeError):
                        continue

                # Grand total = items + shipping + tax (so the stored total matches the order summary).
                purchase.total_amount = calculated_total + (purchase.shipping_cost or Decimal('0.00')) + (purchase.tax_amount or Decimal('0.00'))
                # Authoritatively derive payment status from paid vs total, so it can
                # never disagree with the amounts (client value is not trusted).
                _paid = purchase.paid_amount or Decimal('0.00')
                _total = purchase.total_amount or Decimal('0.00')
                purchase.payment_status = ('PAID' if _paid >= _total and _total > 0
                                           else 'PARTIAL' if _paid > 0 else 'UNPAID')
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

    @action(detail=True, methods=['patch', 'put'], url_path='edit-full')
    def edit_full(self, request, pk=None):
        """Full edit of a purchase order header + line items, recomputing the total.

        Mirrors create_purchase but updates an existing order. Editing is blocked
        once the order has been RECEIVED (stock already synced to inventory).
        """
        from decimal import Decimal
        from django.db import IntegrityError, transaction
        from modules.products.models import SupplierProduct

        purchase = self.get_object()

        if str(purchase.status).upper() == 'RECEIVED' or purchase.is_inventory_synced:
            return Response(
                {"error": "Received purchase orders can no longer be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = request.data.copy()
            items_data = data.pop('items', None)

            supplier_id = data.get('supplier') or data.get('supplier_id')
            if not supplier_id:
                return Response({"error": "Supplier is required"}, status=400)
            if items_data is not None and len(items_data) == 0:
                return Response({"error": "At least one item is required"}, status=400)

            # Header normalization (mirror create_purchase)
            for helper_field in ['supplier_name', 'order_date', 'purchase_number']:
                data.pop(helper_field, None)  # never reassign the human-facing PO number

            if data.get('status'):
                s = str(data['status']).upper()
                if s == 'ORDERED':
                    s = 'PENDING'
                if s == 'RECEIVED':
                    # Receiving must go through the dedicated status/warehouse flow.
                    return Response(
                        {"error": "Use the Receive action to mark an order received."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                data['status'] = s

            if data.get('payment_status'):
                data['payment_status'] = str(data['payment_status']).upper()
            if data.get('payment_method'):
                data['payment_method'] = str(data['payment_method']).upper()

            warehouse_id = data.get('warehouse') or data.get('warehouse_id')

            for date_field in ['expected_delivery_date', 'payment_date']:
                if date_field in data:
                    val = str(data[date_field]).strip()
                    data[date_field] = val if val else None

            for num_field in ['paid_amount', 'shipping_cost', 'tax_amount']:
                if num_field in data:
                    try:
                        val = str(data[num_field]).strip()
                        data[num_field] = Decimal(val) if val else Decimal('0.00')
                    except (ValueError, TypeError, Exception):
                        data[num_field] = Decimal('0.00')

            header_fields = [
                'reference_number', 'shipping_cost', 'tax_amount', 'status',
                'payment_status', 'payment_method', 'expected_delivery_date', 'notes',
            ]

            with transaction.atomic():
                # Update header
                purchase.supplier_id = supplier_id
                if warehouse_id and str(warehouse_id).strip():
                    purchase.warehouse_id = warehouse_id
                for k in header_fields:
                    if k in data:
                        setattr(purchase, k, data[k])

                # Replace items + recompute total (only when items were supplied)
                if items_data is not None:
                    purchase.items.all().delete()
                    calculated_total = Decimal('0.00')
                    for item in items_data:
                        p_id = item.get('product')
                        if not p_id:
                            continue
                        try:
                            price = Decimal(str(item.get('unit_price', '0')))
                            qty = int(item.get('quantity', 1))
                            items_per = int(item.get('items_per_carton', 1))
                            packaging = item.get('packaging_type', 'SINGLE')

                            sp_obj = SupplierProduct.objects.filter(id=p_id).first()
                            weight = item.get('weight') or (sp_obj.weight if sp_obj else '')
                            size = item.get('size') or (sp_obj.size if sp_obj else '')

                            PurchaseOrderItem.objects.create(
                                purchase_order=purchase,
                                product_id=p_id,
                                packaging_type=packaging,
                                items_per_carton=items_per,
                                quantity=qty,
                                price=price,
                                weight=weight,
                                size=size,
                                selling_price=Decimal('0.00'),
                            )
                            total_units = qty * items_per if packaging == 'CARTON' else qty
                            calculated_total += (Decimal(str(total_units)) * price)
                        except (ValueError, TypeError):
                            continue
                    # Grand total = items + shipping + tax (header values already applied above).
                    purchase.total_amount = calculated_total + (purchase.shipping_cost or Decimal('0.00')) + (purchase.tax_amount or Decimal('0.00'))

                # Re-derive payment status from paid vs total so edits stay consistent.
                _paid = purchase.paid_amount or Decimal('0.00')
                _total = purchase.total_amount or Decimal('0.00')
                purchase.payment_status = ('PAID' if _paid >= _total and _total > 0
                                           else 'PARTIAL' if _paid > 0 else 'UNPAID')
                purchase.save()

            return Response(PurchaseOrderSerializer(purchase).data)

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


class PurchaseReturnViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    """ViewSet for purchase returns with supplier response workflow"""
    serializer_class = PurchaseReturnSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'purchases'
    # Tenant isolation through the PurchaseReturn's own tenant column.
    tenant_field = 'tenant'
    shadow_safe = True  # get_queryset limits a supplier to their own returns
    # Scope through the originating purchase order's branch.
    branch_field = 'purchase_order__warehouse'
    # Branch admins see only returns against purchases they created.
    creator_field = 'purchase_order__created_by'

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

        # Tenant isolation (no-op for the platform operator & supplier shadow login).
        qs = scope_to_tenant(user, qs, 'tenant')

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

            # Branch isolation: a branch admin can only return a purchase order from
            # their own branch (helper returns True for super admins).
            _po = None
            if po_id:
                _po = PurchaseOrder.objects.filter(id=po_id).first()
                if _po and not user_can_use_warehouse(request.user, str(getattr(_po, 'warehouse_id', '') or '')):
                    return Response({"error": "This purchase order belongs to another branch."}, status=status.HTTP_403_FORBIDDEN)

            # Remove non-model fields
            data.pop('supplier_name', None)
            
            allowed_fields = ['status', 'reason', 'return_date', 'total_refund_amount']
            final_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            # Explicitly set Foreign Keys and Handle Empty Strings
            final_data['supplier_id'] = supplier_id if supplier_id and str(supplier_id).strip() else None
            final_data['purchase_order_id'] = po_id if po_id and str(po_id).strip() else None

            # Tenant isolation: copy the owning Admin from the parent purchase order
            # when present, else fall back to the actor's tenant (None for shadow).
            _tid = getattr(_po, 'tenant_id', None) if _po is not None else None
            if _tid is None:
                _tid = tenant_id_for(request.user)
            if _tid is not None:
                final_data['tenant_id'] = _tid

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
        from django.db.models import F, Value
        from django.db.models.functions import Greatest
        from modules.inventory.models import Stock
        from modules.products.models import SupplierProduct, Product
        from modules.users.models import UserActivityLog

        # Scope the deduction to the return's own branch when known, so a purchase
        # return only ever depletes the branch it was purchased into.
        _wh = getattr(getattr(ret, 'purchase_order', None), 'warehouse_id', None)
        _branch = {'warehouse_id': _wh} if _wh else {}

        try:
            with transaction.atomic():
                for item in ret.items.all():
                    sp = item.product
                    if not sp: continue

                    # 1. Deduct from Admin Stock — tenant + branch scoped, clamped at
                    # zero so a return can never drive stock negative.
                    Stock.objects.filter(product_name=sp.name, supplier=ret.supplier, tenant_id=ret.tenant_id, **_branch).update(
                        total_quantity=Greatest(F('total_quantity') - item.quantity, Value(0))
                    )

                    # 1b. Deduct from Admin Product Catalog to sync Admin UI (tenant + branch scoped)
                    Product.objects.filter(product_name=sp.name, supplier=ret.supplier, tenant_id=ret.tenant_id, **_branch).update(
                        total_quantity=Greatest(F('total_quantity') - item.quantity, Value(0))
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
