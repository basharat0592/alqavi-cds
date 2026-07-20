from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
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
        # System (in-house) riders are private to the admin who created them — every
        # other admin in the tenant sees only the shared (non-system) riders.
        from django.db.models import Q
        qs = qs.filter(Q(is_system=False) | Q(created_by=self.request.user))
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search)
                | Q(email__icontains=search) | Q(phone__icontains=search)
            )
        return qs

    def paginate_queryset(self, queryset):
        # Rider lists + dropdowns load the full set and paginate client-side.
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

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

    # Branch feed: only orders the admin has actually DISPATCHED (status SHIPPED) show
    # to riders — nothing appears until the admin clicks "Shipped". A dispatch assigned
    # to a specific rider is delivery_person=that rider (only they see it); a broadcast
    # ("all riders") is delivery_person=NULL (every branch rider sees it to claim).
    # Unshipped orders (PENDING/CONFIRMED/PROCESSING) are never shown.
    from django.db.models import Q
    branch_orders = []
    if rider.warehouse_id:
        branch_qs = (Order.objects
                     .filter(warehouse_id=rider.warehouse_id, status='SHIPPED')
                     .filter(Q(delivery_person__isnull=True) | Q(delivery_person=rider))
                     .order_by('-created_at'))
        if rider.tenant_id:
            branch_qs = branch_qs.filter(tenant_id=rider.tenant_id)
        branch_orders = OrderSerializer(branch_qs, many=True, context={'request': request}).data

    return Response({
        'rider': {'id': rider.id, 'name': rider.name, 'phone': rider.phone,
                  'vehicle_type': rider.vehicle_type, 'vehicle_number': rider.vehicle_number,
                  'is_system': rider.is_system,
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
    # Riders may only move an order along the delivery path (+ report delivered/cancel).
    allowed = {'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'}
    if new_status not in allowed:
        return Response({'error': f'Riders can only set: {", ".join(sorted(allowed))}'}, status=400)

    if new_status in ('DELIVERED', 'CANCELLED'):
        # A rider tapping "Delivered" or "Cancel" is a REQUEST, not the final word. It
        # does NOT deduct/settle/release anything — it just flags the order as rider-
        # reported so the rider sees "waiting for response" and the admin can confirm.
        # The admin's own DELIVERED/CANCELLED action is what finalizes. Order stays SHIPPED.
        if str(order.status).upper() != 'SHIPPED':
            order.status = 'SHIPPED'
        if new_status == 'DELIVERED':
            order.rider_reported_delivered = True
            order.rider_reported_cancelled = False
        else:
            order.rider_reported_cancelled = True
            order.rider_reported_delivered = False
        order.save(update_fields=['status', 'rider_reported_delivered', 'rider_reported_cancelled'])
    else:
        order.status = new_status
        order.save()
    return Response(OrderSerializer(order, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_delivery_proof(request, order_id):
    """Rider uploads a proof-of-delivery photo (+ GPS location) for one of their own
    assigned orders. Shown to the admin as delivery verification."""
    from django.utils import timezone
    from modules.sales.models import Order
    from modules.sales.serializers import OrderSerializer

    rider = _current_rider(request)
    if not rider:
        return Response({'error': 'Not a delivery account'}, status=403)

    order = Order.objects.filter(id=order_id, delivery_person=rider).first()
    if not order:
        return Response({'error': 'Order not found or not assigned to you'}, status=404)

    image = request.FILES.get('image') or request.FILES.get('proof_image')
    if not image:
        return Response({'error': 'No image provided'}, status=400)

    order.proof_image = image
    order.proof_lat = str(request.data.get('lat') or '')[:32]
    order.proof_lng = str(request.data.get('lng') or '')[:32]
    order.proof_at = timezone.now()
    order.save(update_fields=['proof_image', 'proof_lat', 'proof_lng', 'proof_at'])
    return Response(OrderSerializer(order, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_order(request, order_id):
    """A rider CLAIMS an unassigned order from their branch feed. Succeeds only if
    the order is still unassigned (or already theirs); once claimed it belongs to
    this rider and drops off every other rider's feed."""
    from modules.sales.models import Order
    from modules.sales.serializers import OrderSerializer

    rider = _current_rider(request)
    if not rider:
        return Response({'error': 'Not a delivery account'}, status=403)

    qs = Order.objects.filter(id=order_id, warehouse_id=rider.warehouse_id)
    if rider.tenant_id:
        qs = qs.filter(tenant_id=rider.tenant_id)
    order = qs.first()
    if not order:
        return Response({'error': 'Order not found in your branch.'}, status=404)
    if order.delivery_person_id and order.delivery_person_id != rider.id:
        return Response({'error': 'This order has already been assigned to another rider.'}, status=400)
    if str(order.status).upper() in ('DELIVERED', 'CANCELLED', 'REJECTED'):
        return Response({'error': 'This order is already completed.'}, status=400)

    order.delivery_person = rider
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
