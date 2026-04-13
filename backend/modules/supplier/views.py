from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Supplier
from .serializers import SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    """ViewSet for Supplier CRUD operations"""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
