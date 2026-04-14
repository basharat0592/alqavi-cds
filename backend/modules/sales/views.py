from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, F, ExpressionWrapper, DecimalField
from .models import Order, OrderItem
from .serializers import OrderSerializer, CreateOrderSerializer

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateOrderSerializer
        return OrderSerializer

    def get_permissions(self):
        if self.action in ['create', 'track']:
            return [permissions.AllowAny()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.all() if user.is_staff else Order.objects.filter(user=user) if user.is_authenticated else Order.objects.none()
        
        # Admin Filters
        if user.is_staff:
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

    @action(detail=True, methods=['patch'], permission_classes=[permissions.IsAdminUser])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)
        
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


from .models import PurchaseOrder
from .serializers import PurchaseOrderSerializer
from modules.products.models import SupplierProduct

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().order_by('-order_date')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        # If supplier, only show their own POs
        return self.queryset.filter(supplier=user)


class SupplierDashboardViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        user = request.user
        
        # Only relevant for suppliers (or staff impersonating)
        total_products = SupplierProduct.objects.filter(supplier=user).count()
        
        po_qs = PurchaseOrder.objects.filter(supplier=user)
        pending_orders = po_qs.filter(status='PENDING').count()
        received_orders = po_qs.filter(status__in=['RECEIVED', 'DELIVERED']).count()
        
        total_order_value = po_qs.filter(status__in=['RECEIVED', 'DELIVERED']).aggregate(tot=Sum('total_amount'))['tot'] or 0
        
        return Response({
            "total_products": total_products,
            "pending_orders": pending_orders,
            "received_orders": received_orders,
            "total_order_value": float(total_order_value),
            "supplier_name": user.get_full_name() or user.username
        })
