from django.db.models import Count
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import Warehouse, Stock, StockMovement
from .serializers import WarehouseSerializer, StockSerializer, StockMovementSerializer
from core.permissions import HasModulePermission
from core.scoping import (
    BranchScopedQuerysetMixin, scope_to_tenant, scope_queryset, tenant_id_for,
    user_can_use_warehouse, user_warehouse_ids,
)


def compute_low_stock(user, warehouse_id=None, limit=60):
    """Per-branch low-stock list.

    Returns products whose on-hand quantity (summed within the user's tenant AND
    branch scope) is at or below their ``Product.min_count`` (default 10). A branch
    admin sees only their warehouse(s) — an item full in one branch but empty in
    another is still flagged for the empty branch. The platform operator sees every
    tenant. ``warehouse_id`` narrows to a single branch.
    """
    from modules.products.models import Product
    stock_scope = scope_to_tenant(user, Stock.objects.all(), 'tenant')
    stock_scope = scope_queryset(user, stock_scope, 'warehouse')
    if warehouse_id:
        stock_scope = stock_scope.filter(warehouse_id=warehouse_id)

    qty_by_name, sup_by_name = {}, {}
    for s in stock_scope.values('product_name', 'supplier', 'total_quantity'):
        key = (s['product_name'] or '').strip().lower()
        if not key:
            continue
        qty_by_name[key] = qty_by_name.get(key, 0) + (s['total_quantity'] or 0)
        if key not in sup_by_name and s['supplier']:
            sup_by_name[key] = str(s['supplier'])

    prod_meta = {}
    for p in scope_to_tenant(user, Product.objects.all(), 'tenant').only('product_name', 'min_count', 'sku'):
        k = (p.product_name or '').strip().lower()
        if k:
            prod_meta[k] = {'min': p.min_count if p.min_count is not None else 10,
                            'sku': p.sku, 'name': p.product_name}

    low = []
    for key, qty in qty_by_name.items():
        meta = prod_meta.get(key, {})
        m = meta.get('min', 10)
        if qty <= m:
            low.append({
                'product_name': meta.get('name') or key,
                'qty': qty, 'min': m,
                'sku': meta.get('sku'),
                'supplier': sup_by_name.get(key),
            })
    low.sort(key=lambda x: x['qty'])
    return low[:limit]


@api_view(['GET'])
@permission_classes([AllowAny])
def public_branches(request):
    """Public list of active branches (warehouses) for the storefront's branch
    picker — the platform's own branches created by the Super Admin (tenant NULL)."""
    qs = Warehouse.objects.filter(is_active=True, tenant__isnull=True).order_by('name')
    data = [
        {
            'id': str(w.id),
            'name': w.name,
            'area': (w.area.name if w.area_id else None),
            'location': w.location,
        }
        for w in qs
    ]
    return Response(data)


class WarehouseViewSet(viewsets.ModelViewSet):
    """Branch (warehouse) registry.

    Visibility is by ASSIGNMENT, not by tenant: a branch is created by the Super
    Admin (tenant NULL) and then assigned to one or more Admins via the
    ``User.warehouses`` M2M. A branch Admin must therefore see the branches
    assigned to them even though those branches carry tenant NULL — scoping by
    ``tenant`` alone would hide them (the round-trip bug). We scope by the user's
    assigned warehouse ids instead:

    * Super Admin / superuser  -> every branch.
    * Branch Admin / staff     -> only their assigned branch(es).
    * Portal/shadow logins      -> none (they use the public_branches endpoint).
    """
    queryset = Warehouse.objects.all().order_by('name')
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    perm_module = 'inventory'

    def get_queryset(self):
        from django.db.models import Q
        user = self.request.user
        qs = Warehouse.objects.all().order_by('name')
        if (getattr(user, 'is_supplier', False) or getattr(user, 'is_customer', False)
                or getattr(user, 'is_delivery', False)):
            return qs.none()
        ids = user_warehouse_ids(user)  # None => unscoped (Super Admin); set => assigned branches
        if ids is None:
            return qs
        # A branch Admin sees branches ASSIGNED to them (M2M — covers Super-Admin-
        # created, tenant-NULL branches) OR owned by their tenant (legacy safety).
        cond = Q(id__in=ids) if ids else Q(pk__in=[])
        tid = tenant_id_for(user)
        if tid is not None:
            cond = cond | Q(tenant_id=tid)
        return qs.filter(cond)

    def paginate_queryset(self, queryset):
        # Branch dropdowns need EVERY branch, not just the first page.
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        serializer.save(tenant_id=tenant_id_for(self.request.user))


class StockViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    perm_module = 'inventory'
    # Stock is shared branch inventory: show ALL products in the user's
    # warehouse(s), no matter who brought them in (branch-scoped, not per-creator).
    branch_field = 'warehouse'
    # Tenant (owning-Admin) isolation is the primary axis.
    tenant_field = 'tenant'

    def perform_create(self, serializer):
        actor = self.request.user
        real = actor if (getattr(actor, 'pk', None) and actor.__class__.__name__ == 'User'
                         and not getattr(actor, 'is_supplier', False)
                         and not getattr(actor, 'is_customer', False)) else None
        stock = serializer.save(created_by=real, tenant_id=tenant_id_for(actor))
        # Record initial purchase movement
        StockMovement.objects.create(
            stock=stock,
            movement_type='PURCHASE',
            quantity=stock.total_quantity,
            to_warehouse=stock.warehouse,
            date=stock.date,
            description="Initial stock purchase",
            tenant_id=stock.tenant_id,
        )

    def get_queryset(self):
        queryset = Stock.objects.exclude(product__status='ARCHIVED')
        
        # 1. Base Filters
        warehouse_id = self.request.query_params.get('warehouse')
        product_name = self.request.query_params.get('product') # From dropdown
        search = self.request.query_params.get('search') # Manual search
        status_param = self.request.query_params.get('status') # LOW or OUT
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        
        if product_name:
            queryset = queryset.filter(product_name__icontains=product_name)
        
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(product_name__icontains=search) | 
                Q(supplier__name__icontains=search) |
                Q(supplier__company__icontains=search)
            )

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # 2. Critical Stock Status Filters
        if status_param == 'LOW':
            # Assuming low stock threshold is < 100 for this system
            queryset = queryset.filter(total_quantity__lt=100, total_quantity__gt=0)
        elif status_param == 'OUT':
            queryset = queryset.filter(total_quantity__lte=0)

        # 3. Financial Range Filters
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        if min_price:
            queryset = queryset.filter(price_per_item__gte=min_price)
        if max_price:
            queryset = queryset.filter(price_per_item__lte=max_price)

        return queryset.order_by('-created_at')

    def list(self, request, *args, **kwargs):
        if request.query_params.get('no_pagination') == 'true':
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Per-branch low-stock alerts (tenant + branch scoped) vs Product.min_count.
        Optional ?warehouse= narrows to one branch."""
        wh = request.query_params.get('warehouse')
        return Response(compute_low_stock(request.user, wh))


    @action(detail=True, methods=['get'])
    def movements(self, request, pk=None):
        primary_stock = self.get_object()
        
        # Find all matching stock records ONLY in the CURRENT warehouse
        # matching by Product Name, Price, and Supplier
        matching_stock_ids = scope_to_tenant(request.user, Stock.objects.all()).filter(
            warehouse=primary_stock.warehouse,
            product=primary_stock.product,
            product_name=primary_stock.product_name,
            price_per_item=primary_stock.price_per_item,
            supplier=primary_stock.supplier,
            weight=primary_stock.weight,
            size=primary_stock.size
        ).values_list('id', flat=True)

        movements = StockMovement.objects.filter(
            stock_id__in=matching_stock_ids
        ).order_by('-created_at')

        serializer = StockMovementSerializer(movements, many=True)
        return Response(serializer.data)
