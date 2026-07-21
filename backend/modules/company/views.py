from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from modules.supplier.models import Supplier
from modules.supplier.serializers import SupplierSerializer
from .models import Area
from .serializers import AreaSerializer
from core.permissions import HasModulePermission
from core.scoping import tenant_id_for, is_platform_operator, scope_to_tenant


def _is_portal_login(user):
    """Supplier / customer / delivery shadow logins — never allowed into the
    admin-facing supplier registry."""
    return bool(getattr(user, 'is_supplier', False)
                or getattr(user, 'is_customer', False)
                or getattr(user, 'is_delivery', False))


class AreaViewSet(viewsets.ModelViewSet):
    """CRUD for geographic areas / territories used in Area Manager scoping.

    Reads are public so the storefront's "Deliver to" city picker works for
    guests too; writes still require an authenticated, permitted staff user.
    """
    serializer_class = AreaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModulePermission]
    perm_module = 'areas'

    def get_queryset(self):
        from core.scoping import is_platform_operator
        qs = Area.objects.all()
        user = self.request.user
        # Areas/territories are a SUPER-ADMIN-only function. Internal branch admins
        # & staff never see them. The public storefront / customer / supplier /
        # delivery portals still get the global delivery-city list for checkout.
        if is_platform_operator(user):
            pass  # Super Admin manages every area
        elif (not getattr(user, 'is_authenticated', False)
              or getattr(user, 'is_customer', False)
              or getattr(user, 'is_supplier', False)
              or getattr(user, 'is_delivery', False)):
            qs = qs.filter(tenant__isnull=True)
        else:
            qs = qs.none()
        if self.request.query_params.get('active') == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def _ensure_super(self):
        from rest_framework.exceptions import PermissionDenied
        if not is_platform_operator(self.request.user):
            raise PermissionDenied('Only the super admin can manage areas / territories.')

    def create(self, request, *args, **kwargs):
        self._ensure_super()
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._ensure_super()
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._ensure_super()
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        # tenant is a FK — assign via *_id so an int/None binds correctly (a bare
        # `tenant=<int>` raises ValueError on save for non-super creators).
        serializer.save(tenant_id=tenant_id_for(self.request.user))


class SupplierViewSet(viewsets.ModelViewSet):
    """Admin-facing Supplier registry.

    Suppliers are shared across all Admins by design (each Admin's *ledger* with a
    supplier is still tenant-scoped, see supplier ledger). Access is therefore
    limited to authenticated internal staff; portal/shadow logins and anonymous
    requests are denied — the endpoint previously ran `AllowAny`, which exposed
    supplier PII (and passwords) to the public.
    """
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'suppliers'

    def get_queryset(self):
        if _is_portal_login(self.request.user):
            return Supplier.objects.none()
        # Per-Admin isolation: each admin sees only their own suppliers; the Super
        # Admin sees all (scope_to_tenant is a no-op for the platform operator).
        return scope_to_tenant(self.request.user, Supplier.objects.all(), 'tenant').order_by('-created_at')

    def paginate_queryset(self, queryset):
        # The supplier registry + purchase-order supplier picker load the full list
        # and paginate client-side, so honour an explicit opt-out.
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        # Stamp the creating admin as the owning tenant so it stays private to them.
        tid = tenant_id_for(self.request.user)
        serializer.save(**({'tenant_id': tid} if tid else {}))

    def create(self, request, *args, **kwargs):
        if _is_portal_login(request.user):
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)
