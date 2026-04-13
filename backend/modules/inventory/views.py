from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Warehouse, Stock
from .serializers import WarehouseSerializer, StockSerializer


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all().order_by('name')
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated]


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        warehouse_id = self.request.query_params.get('warehouse')
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
        return queryset
