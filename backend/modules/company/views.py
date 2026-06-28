from rest_framework import viewsets, permissions
from modules.supplier.models import Supplier
from modules.supplier.serializers import SupplierSerializer
from .models import Area
from .serializers import AreaSerializer
from core.permissions import HasModulePermission
from core.scoping import tenant_id_for


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

    def perform_create(self, serializer):
        serializer.save(tenant=tenant_id_for(self.request.user))


class SupplierViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Supplier operations.
    Points to the central supplier module for data consistency.
    """
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    permission_classes = [permissions.AllowAny] # Set to allow any for now to debug the 500
