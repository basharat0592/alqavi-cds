from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from .models import Order, OrderItem
from .serializers import OrderSerializer, CreateOrderSerializer

class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        print(f"DEBUG IsAdminOrStaff: request.user = {user}, is_authenticated = {getattr(user, 'is_authenticated', False)}")
        
        if not user or not user.is_authenticated:
            return False
            
        print(f"DEBUG IsAdminOrStaff: user.is_staff = {user.is_staff}, user.is_superuser = {user.is_superuser}")
        if user.is_staff or user.is_superuser:
            return True
        
        role_name = getattr(user.role, 'name', '').lower() if hasattr(user, 'role') and user.role else ''
        print(f"DEBUG IsAdminOrStaff: role_name = {role_name}")
        
        if any(r in role_name for r in ['admin', 'staff', 'manager', 'superuser', 'supplier']):
            return True
            
        # Temporarily allow any authenticated user to update their own order status to catch edge cases
        # where the user is logged in as a normal customer but wants to cancel their order.
        if view.action in ['partial_update', 'update']:
            return True
            
        return False

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrderSerializer
        return OrderSerializer

    def get_permissions(self):
        if self.action in ['create', 'track', 'stats']:
            return [permissions.AllowAny()]
        if self.action in ['update', 'partial_update', 'destroy', 'update_status']:
            return [IsAdminOrStaff()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Order.objects.none()

        # Check if user is an admin/staff/manager/supplier
        is_admin_user = user.is_staff or user.is_superuser
        if not is_admin_user and hasattr(user, 'role') and user.role:
            role_name = user.role.name.lower()
            if any(r in role_name for r in ['admin', 'staff', 'manager', 'superuser', 'supplier']):
                is_admin_user = True
        
        if is_admin_user:
            queryset = Order.objects.all()
            
            # Admin Filters
            status_filter = self.request.query_params.get('status')
            date_filter = self.request.query_params.get('date')
            exclude_status = self.request.query_params.get('exclude_status')
            
            if status_filter:
                queryset = queryset.filter(status=status_filter.upper())
            if date_filter:
                queryset = queryset.filter(created_at__date=date_filter)
            if exclude_status:
                statuses = [s.upper() for s in exclude_status.split(',')]
                queryset = queryset.exclude(status__in=statuses)
            
            return queryset.order_by('-created_at')
        
        # Regular customer: only their own orders
        return Order.objects.filter(user=user).order_by('-created_at')

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

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminOrStaff])
    def update_status(self, request, pk=None):
        order = self.get_object()
        
        # 1. Check if already delivered (Lock)
        if order.status == 'DELIVERED':
            return Response({"error": "Order is already delivered and locked."}, status=status.HTTP_400_BAD_REQUEST)
            
        new_status = request.data.get('status', '').upper()
        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. Inventory Deduction Logic
        # Note: Deduction now happens at order creation time to prevent overselling.
        # However, if the order is cancelled, we should restore the stock.
        if new_status in ['CANCELLED', 'REJECTED'] and order.status not in ['CANCELLED', 'REJECTED']:
            try:
                from django.db import transaction
                with transaction.atomic():
                    for item in order.items.all():
                        if item.product:
                            if item.product.stock:
                                stock = item.product.stock
                                stock.total_quantity = F('total_quantity') + item.quantity
                                stock.save()
                            
                            product = item.product
                            product.total_quantity = F('total_quantity') + item.quantity
                            product.save()
            except Exception as e:
                return Response({"error": f"Inventory restoration failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 3. Save new status
        order.status = new_status
        order.save()
        return Response(OrderSerializer(order).data)
    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrStaff])
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
            "orders_today": Order.objects.filter(created_at__date=timezone.now().date()).count(),
            "pending_orders": pending_orders,
            "delivered_orders": delivered_count,
            "recent_orders": recent_orders,
            "revenue_history": history,
            "top_products": [],
            "recent_purchases": []
        })
