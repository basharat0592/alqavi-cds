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
        from core.scoping import user_area_ids, scope_to_tenant
        area_ids = user_area_ids(self.request.user)
        if area_ids is not None:
            qs = qs.filter(area_id__in=area_ids)
        # Per-admin (tenant) isolation: a tenant user only sees riders in their
        # tenant; the platform operator / shadow logins see all.
        qs = scope_to_tenant(self.request.user, qs, 'tenant')
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
        # Stamp the creating admin + owning tenant for per-admin isolation.
        from core.scoping import tenant_id_for
        creator = request.user if getattr(request.user, 'is_staff', False) else None
        rider = serializer.save(plain_password=plain or '', created_by=creator,
                                tenant_id=tenant_id_for(request.user))
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

    # Branch feed: every ACTIVE order of the rider's assigned branch (warehouse),
    # scoped to their tenant, so they see all deliverable orders for their branch —
    # not only the ones explicitly assigned to them.
    branch_orders = []
    if rider.warehouse_id:
        branch_qs = (Order.objects
                     .filter(warehouse_id=rider.warehouse_id)
                     .exclude(status__in=['DELIVERED', 'CANCELLED', 'REJECTED'])
                     .order_by('-created_at'))
        if rider.tenant_id:
            branch_qs = branch_qs.filter(tenant_id=rider.tenant_id)
        branch_orders = OrderSerializer(branch_qs, many=True, context={'request': request}).data

    return Response({
        'rider': {'id': rider.id, 'name': rider.name, 'phone': rider.phone,
                  'vehicle_type': rider.vehicle_type, 'vehicle_number': rider.vehicle_number,
                  'warehouse': rider.warehouse_id, 'warehouse_name': (rider.warehouse.name if rider.warehouse_id else None)},
        'stats': stats,
        'results': orders,
        'branch_orders': branch_orders,
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
    if new_status == 'DELIVERED':
        # Deduct branch stock + settle payment + book income (same completion the
        # admin delivery runs). The order shipped as SHIPPED, so stock was reserved
        # at POS create — this converts the reservation into a real deduction.
        from modules.sales.views import complete_delivery_stock
        complete_delivery_stock(order)
    else:
        order.save()
    return Response(OrderSerializer(order, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_my_password(request):
    """The signed-in rider changes their own password."""
    from django.contrib.auth.hashers import check_password
    rider = _current_rider(request)
    if not rider:
        return Response({'error': 'Not a delivery account'}, status=403)
    old = request.data.get('old_password') or ''
    new = request.data.get('new_password') or ''
    if len(new) < 8:
        return Response({'error': 'Password must be at least 8 characters long.'}, status=400)
    if not check_password(old, rider.password):
        return Response({'error': 'Old password is incorrect.'}, status=400)
    rider.password = make_password(new)
    rider.plain_password = new
    rider.save(update_fields=['password', 'plain_password'])
    return Response({'message': 'Password changed successfully.'})
