from rest_framework import viewsets, permissions
from modules.supplier.models import Supplier
from modules.supplier.serializers import SupplierSerializer
from .models import Area
from .serializers import AreaSerializer
from core.permissions import HasModulePermission


class AreaViewSet(viewsets.ModelViewSet):
    """CRUD for geographic areas / territories used in Area Manager scoping."""
    serializer_class = AreaSerializer
    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    perm_module = 'areas'

    def get_queryset(self):
        qs = Area.objects.all()
        if self.request.query_params.get('active') == 'true':
            qs = qs.filter(is_active=True)
        return qs


class SupplierViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Supplier operations.
    Points to the central supplier module for data consistency.
    """
    queryset = Supplier.objects.all().order_by('-created_at')
    serializer_class = SupplierSerializer
    permission_classes = [permissions.AllowAny] # Set to allow any for now to debug the 500
