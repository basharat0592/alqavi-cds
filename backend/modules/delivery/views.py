from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.hashers import make_password
from django.db import transaction

from .models import DeliveryPerson
from .serializers import DeliveryPersonSerializer, DeliveryPersonCreateSerializer
from core.permissions import HasModulePermission


class DeliveryPersonViewSet(viewsets.ModelViewSet):
    """Admin CRUD for delivery riders."""
    queryset = DeliveryPerson.objects.all().order_by('-created_at')
    serializer_class = DeliveryPersonSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    perm_module = 'delivery'

    def get_queryset(self):
        qs = DeliveryPerson.objects.all().order_by('-created_at')
        from core.scoping import user_area_ids
        area_ids = user_area_ids(self.request.user)
        if area_ids is not None:
            qs = qs.filter(area_id__in=area_ids)
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search)
                | Q(email__icontains=search) | Q(phone__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DeliveryPersonCreateSerializer
        return DeliveryPersonSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        plain = data.get('password')
        if plain:
            data['password'] = make_password(plain)
        if not data.get('username') and data.get('email'):
            data['username'] = data.get('email')
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        rider = serializer.save(plain_password=plain or '')
        return Response(DeliveryPersonSerializer(rider, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        plain = data.get('password')
        if plain:
            data['password'] = make_password(plain)
        else:
            data.pop('password', None)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        if plain:
            serializer.save(plain_password=plain)
        else:
            serializer.save()
        return Response(DeliveryPersonSerializer(instance, context={'request': request}).data)


# ── Delivery rider self endpoints (the rider's own dashboard) ─────────────────
def _current_rider(request):
    """Resolve the DeliveryPerson behind a shadow `del_` login."""
    user = request.user
    if getattr(user, 'is_delivery', False):
        return DeliveryPerson.objects.filter(id=user.real_id).first()
    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_deliveries(request):
    """Orders assigned to the signed-in rider, with quick stats."""
    from modules.sales.models import Order
    from modules.sales.serializers import OrderSerializer

    rider = _current_rider(request)
    if not rider:
        return Response({'error': 'Not a delivery account'}, status=403)

    qs = Order.objects.filter(delivery_person=rider).order_by('-created_at')
    status_filter = request.query_params.get('status')
    if status_filter and status_filter != 'ALL':
        qs = qs.filter(status=status_filter.upper())

    orders = OrderSerializer(qs, many=True, context={'request': request}).data
    all_qs = Order.objects.filter(delivery_person=rider)
    stats = {
        'total': all_qs.count(),
        'delivered': all_qs.filter(status='DELIVERED').count(),
        'in_progress': all_qs.exclude(status__in=['DELIVERED', 'CANCELLED', 'REJECTED']).count(),
        'cancelled': all_qs.filter(status__in=['CANCELLED', 'REJECTED']).count(),
    }
    return Response({
        'rider': {'id': rider.id, 'name': rider.name, 'phone': rider.phone,
                  'vehicle_type': rider.vehicle_type, 'vehicle_number': rider.vehicle_number},
        'stats': stats,
        'results': orders,
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_delivery_status(request, order_id):
    """Rider updates the status of one of their own assigned orders."""
    from django.utils import timezone
    from modules.sales.models import Order
    from modules.sales.serializers import OrderSerializer

    rider = _current_rider(request)
    if not rider:
        return Response({'error': 'Not a delivery account'}, status=403)

    order = Order.objects.filter(id=order_id, delivery_person=rider).first()
    if not order:
        return Response({'error': 'Order not found or not assigned to you'}, status=404)

    new_status = str(request.data.get('status', '')).upper()
    # Riders may only move an order along the delivery path.
    allowed = {'PROCESSING', 'SHIPPED', 'DELIVERED'}
    if new_status not in allowed:
        return Response({'error': f'Riders can only set: {", ".join(sorted(allowed))}'}, status=400)

    order.status = new_status
    if new_status == 'DELIVERED' and not order.delivered_at:
        order.delivered_at = timezone.now()
    order.save()
    return Response(OrderSerializer(order, context={'request': request}).data)
