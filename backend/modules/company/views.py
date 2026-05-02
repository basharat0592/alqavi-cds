from rest_framework import viewsets, permissions
from modules.supplier.models import Supplier
from modules.supplier.serializers import SupplierSerializer

class SupplierViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Supplier operations.
    Points to the central supplier module for data consistency.
    """
    queryset = Supplier.objects.all().order_by('name')
    serializer_class = SupplierSerializer
    permission_classes = [permissions.AllowAny] # Set to allow any for now to debug the 500
