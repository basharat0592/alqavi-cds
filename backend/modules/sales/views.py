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
        if date_filter:
            try:
                from datetime import datetime
                today = datetime.strptime(date_filter, '%Y-%m-%d').date()
            except ValueError:
                today = timezone.now().date()
        else:
            today = timezone.now().date()
            
        month_start = today.replace(day=1)
        
        # Order Counts
        today_orders = Order.objects.filter(created_at__date=today)
        month_orders = Order.objects.filter(created_at__year=today.year, created_at__month=today.month)
        
        pending_count = Order.objects.filter(status='PENDING').count()
        delivered_count = Order.objects.filter(status='DELIVERED').count()
        
        if date_filter:
            pending_count = today_orders.filter(status='PENDING').count()
            delivered_count = today_orders.filter(status='DELIVERED').count()
        
        # Profit Logic: (Item Price - Item Cost) * Quantity
        def calculate_profit(queryset):
            # We filter for items belonging to these delivered orders
            queryset = queryset.filter(status='DELIVERED')
            items = OrderItem.objects.filter(order__in=queryset)
            profit_data = items.annotate(
                item_profit=ExpressionWrapper(
                    (F('price') - F('cost_price')) * F('quantity'),
                    output_field=DecimalField()
                )
            ).aggregate(total_profit=Sum('item_profit'))
            return profit_data['total_profit'] or 0

        return Response({
            "today_count": today_orders.count(),
            "pending_count": pending_count,
            "delivered_count": delivered_count,
            "today_profit": calculate_profit(today_orders),
            "month_profit": calculate_profit(month_orders),
        })
