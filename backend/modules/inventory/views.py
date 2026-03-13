from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Warehouse, Inventory, InventoryMovement, Batch, StockAdjustment, LowStockAlert
from .serializers import (
    WarehouseSerializer, InventorySerializer, InventoryMovementSerializer,
    BatchSerializer, StockAdjustmentSerializer, LowStockAlertSerializer
)
from django.db import transaction

class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'warehouse_type']
    search_fields = ['name', 'warehouse_code', 'location']

class InventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['warehouse', 'product']
    search_fields = ['sku', 'barcode', 'batch_number', 'product__name']

    def create(self, request, *args, **kwargs):
        """
        Custom create to support 'Add to Existing' logic.
        If a record for this product/warehouse/batch already exists, 
        we increment the quantity instead of failing.
        """
        product_id = request.data.get('product')
        warehouse_id = request.data.get('warehouse')
        batch_number = request.data.get('batch_number')
        quantity_to_add = float(request.data.get('quantity_available', 0))

        with transaction.atomic():
            # Try to find existing record
            existing_record = Inventory.objects.filter(
                product_id=product_id,
                warehouse_id=warehouse_id,
                batch_number=batch_number
            ).first()

            if existing_record:
                # Increment existing quantity
                existing_record.quantity_available = float(existing_record.quantity_available) + quantity_to_add
                existing_record.save()
                
                # Log movement for tracking
                InventoryMovement.objects.create(
                    product_id=product_id,
                    warehouse_id=warehouse_id,
                    movement_type='Adjustment', # Or 'Purchase' as default for Log New Stock
                    quantity=quantity_to_add,
                    previous_quantity=float(existing_record.quantity_available) - quantity_to_add,
                    new_quantity=existing_record.quantity_available,
                    notes=f"Additive stock update via Log New Stock form",
                    created_by=request.user
                )
                
                serializer = self.get_serializer(existing_record)
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            # If no existing, default to standard creation (which will trigger signal)
            return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        # Implementation for stock summary analytics
        total_items = Inventory.objects.count()
        low_stock_count = LowStockAlert.objects.filter(alert_status='Pending').count()
        expired_batches = Batch.objects.filter(status='Expired').count()
        
        return Response({
            'total_items': total_items,
            'low_stock_count': low_stock_count,
            'expired_batches': expired_batches,
        })

class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryMovement.objects.all().order_by('-created_at')
    serializer_class = InventoryMovementSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['warehouse', 'product', 'movement_type']

class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'warehouse', 'product']
    search_fields = ['batch_number']

class StockAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = StockAdjustment.objects.all()
    serializer_class = StockAdjustmentSerializer

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            adjustment = serializer.save(adjusted_by=request.user)
            
            # Real-time stock update logic
            inventory, created = Inventory.objects.get_or_create(
                product=adjustment.product,
                warehouse=adjustment.warehouse,
                defaults={'sku': adjustment.product.sku}
            )
            
            prev_qty = inventory.quantity_available
            if adjustment.adjustment_type == 'Add':
                inventory.quantity_available += adjustment.quantity
            else:
                inventory.quantity_available -= adjustment.quantity
            inventory.save()
            
            # Create Movement Record
            InventoryMovement.objects.create(
                product=adjustment.product,
                warehouse=adjustment.warehouse,
                movement_type='Adjustment',
                quantity=adjustment.quantity if adjustment.adjustment_type == 'Add' else -adjustment.quantity,
                previous_quantity=prev_qty,
                new_quantity=inventory.quantity_available,
                reference_id=str(adjustment.id),
                notes=adjustment.reason,
                created_by=request.user
            )
            
            # Check for Low Stock Alert
            if inventory.quantity_available <= inventory.reorder_level and inventory.reorder_level > 0:
                LowStockAlert.objects.update_or_create(
                    product=inventory.product,
                    warehouse=inventory.warehouse,
                    defaults={
                        'current_quantity': inventory.quantity_available,
                        'reorder_level': inventory.reorder_level,
                        'alert_status': 'Pending'
                    }
                )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)

class LowStockAlertViewSet(viewsets.ModelViewSet):
    queryset = LowStockAlert.objects.all().order_by('-created_at')
    serializer_class = LowStockAlertSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['alert_status', 'warehouse', 'product']
