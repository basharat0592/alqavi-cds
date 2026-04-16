from rest_framework import viewsets, status, filters
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Warehouse, Inventory, InventoryMovement, Batch, StockAdjustment, LowStockAlert, Stock
from .serializers import (
    WarehouseSerializer, InventorySerializer, InventoryMovementSerializer,
    BatchSerializer, StockAdjustmentSerializer, LowStockAlertSerializer, StockSerializer
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
    search_fields = ['product__sku', 'product__barcode', 'batch_number', 'product__name']

    def get_queryset(self):
        qs = Inventory.objects.all()
        include_supplier_only = self.request.query_params.get('include_supplier_only') == 'true'

        # By default exclude inventory records for supplier-only products.
        if not include_supplier_only:
            qs = qs.filter(product__is_supplier_only=False)

        if self.request.user.is_authenticated and not self.request.user.is_superuser:
            if hasattr(self.request.user, 'supplier_profile') and self.request.user.supplier_profile:
                return qs.filter(product__supplier=self.request.user.supplier_profile)
        return qs

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
        # Use filtered queryset to exclude supplier-only products by default
        qs = self.get_queryset()
        total_items = qs.count()
        
        # Filter low stock alerts to only show for admin inventory (non-supplier-only)
        low_stock_qs = LowStockAlert.objects.filter(alert_status='Pending')
        include_supplier_only = request.query_params.get('include_supplier_only') == 'true'
        if not include_supplier_only:
            low_stock_qs = low_stock_qs.filter(product__is_supplier_only=False)
            
        return Response({
            'total_items': total_items,
            'low_stock_count': low_stock_qs.count(),
            'expired_batches': Batch.objects.filter(status='Expired').count(),
        })

    @action(detail=True, methods=['post'], url_path='add_stock')
    def add_stock(self, request, pk=None):
        """Directly add units to an existing inventory record by its PK."""
        inventory = self.get_object()
        qty = request.data.get('quantity', 0)
        try:
            qty = float(qty)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)
        if qty <= 0:
            return Response({'error': 'Quantity must be greater than 0'}, status=status.HTTP_400_BAD_REQUEST)

        import traceback
        try:
            with transaction.atomic():
                prev_qty = float(inventory.quantity_available)
                inventory.quantity_available = prev_qty + qty
                inventory.save()

                InventoryMovement.objects.create(
                    product=inventory.product,
                    warehouse=inventory.warehouse,
                    movement_type='Adjustment',
                    quantity=qty,
                    previous_quantity=prev_qty,
                    new_quantity=inventory.quantity_available,
                    notes=request.data.get('notes', 'Stock added via Stock Management'),
                    created_by=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
                )

                # Resolve any pending low-stock alerts if stock is now healthy
                if inventory.reorder_level and inventory.quantity_available > inventory.reorder_level:
                    LowStockAlert.objects.filter(
                        product=inventory.product,
                        warehouse=inventory.warehouse,
                        alert_status='Pending'
                    ).update(alert_status='Resolved')
        except Exception as e:
            tb = traceback.format_exc()
            print("ERROR IN ADD_STOCK:", tb)
            return Response({'error': str(e), 'traceback': tb}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = self.get_serializer(inventory)
        return Response(serializer.data, status=status.HTTP_200_OK)

class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryMovement.objects.all().order_by('-created_at')
    serializer_class = InventoryMovementSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['warehouse', 'product', 'movement_type']

    def get_queryset(self):
        qs = InventoryMovement.objects.all().order_by('-created_at')
        if self.request.user.is_authenticated and not self.request.user.is_superuser:
            if hasattr(self.request.user, 'supplier_profile') and self.request.user.supplier_profile:
                return qs.filter(product__supplier=self.request.user.supplier_profile)
        return qs

class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'warehouse', 'product']
    search_fields = ['batch_number']

    def get_queryset(self):
        qs = Batch.objects.all()
        if self.request.user.is_authenticated and not self.request.user.is_superuser:
            if hasattr(self.request.user, 'supplier_profile') and self.request.user.supplier_profile:
                return qs.filter(product__supplier=self.request.user.supplier_profile)
        return qs

class StockAdjustmentViewSet(viewsets.ModelViewSet):
    queryset = StockAdjustment.objects.all()
    serializer_class = StockAdjustmentSerializer

    def create(self, request, *args, **kwargs):
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            adjustment = serializer.save(adjusted_by=request.user)
            
            # Real-time stock update logic
            # Use filter().first() instead of get_or_create() to safely handle
            # cases where multiple inventory records exist for the same
            # product/warehouse (different batch_numbers → unique_together).
            inventory = Inventory.objects.filter(
                product=adjustment.product,
                warehouse=adjustment.warehouse,
            ).order_by('id').first()

            if inventory is None:
                # No record exists yet — create a base one
                inventory = Inventory.objects.create(
                    product=adjustment.product,
                    warehouse=adjustment.warehouse,
                    sku=getattr(adjustment.product, 'sku', None) or '',
                    quantity_available=0,
                )
            
            prev_qty = inventory.quantity_available
            if adjustment.adjustment_type == 'Add':
                inventory.quantity_available += adjustment.quantity
            else:
                inventory.quantity_available = max(0, inventory.quantity_available - adjustment.quantity)
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
    permission_classes = [AllowAny]
    queryset = LowStockAlert.objects.all().order_by('-created_at')
    serializer_class = LowStockAlertSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['alert_status', 'warehouse', 'product']

    def get_queryset(self):
        qs = LowStockAlert.objects.all().order_by('-created_at')
        if self.request.user.is_authenticated and not self.request.user.is_superuser:
            if hasattr(self.request.user, 'supplier_profile') and self.request.user.supplier_profile:
                return qs.filter(product__supplier=self.request.user.supplier_profile)
        return qs

class StockViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    queryset = Stock.objects.all().order_by('-created_at')
    serializer_class = StockSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['purchase_type', 'supplier']
    search_fields = ['product_name']

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Analytics for the inventory overview which uses the Stock model"""
        qs = self.get_queryset()
        total_items = qs.count()
        
        # Aggregated stats for the dashboard
        return Response({
            'total_items': total_items,
            'low_stock_count': 0, # Stock model doesn't have reorder_level directly yet
            'expired_batches': 0, 
        })
