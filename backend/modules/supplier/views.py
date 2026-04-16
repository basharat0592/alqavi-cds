from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import Supplier, PurchaseOrder, PurchaseOrderItem
from .serializers import (
    SupplierSerializer, PurchaseOrderSerializer, PurchaseOrderCreateSerializer
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['get'], url_path='products')
    def products(self, request, pk=None):
        """Get all products belonging to this supplier."""
        from modules.products.models import Product
        from modules.products.serializers import ProductSerializer
        products = Product.objects.filter(supplier_id=pk)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().select_related('supplier', 'admin_user').prefetch_related('items__product')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        # Suppliers only see their own POs
        if self.request.user.is_authenticated and hasattr(self.request.user, 'supplier_profile'):
            supplier = self.request.user.supplier_profile
            if supplier:
                qs = qs.filter(supplier=supplier)
        # Filter by supplier param
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        # Filter by status param
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def create(self, request, *args, **kwargs):
        """Create a PO with nested items."""
        serializer = PurchaseOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            po = PurchaseOrder.objects.create(
                supplier_id=serializer.validated_data['supplier'],
                admin_user=request.user if request.user.is_authenticated else None,
                notes=serializer.validated_data.get('notes', ''),
            )

            total = 0
            for item_data in serializer.validated_data['items']:
                poi = PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    product_id=item_data['product'],
                    quantity=int(item_data['quantity']),
                    cost_price=float(item_data['cost_price']),
                )
                total += poi.quantity * poi.cost_price

            po.total_amount = total
            po.save(update_fields=['total_amount'])

        return Response(
            PurchaseOrderSerializer(po).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """Update PO status. When set to DELIVERED, auto-create stock."""
        po = self.get_object()
        new_status = request.data.get('status')

        valid_statuses = [c[0] for c in PurchaseOrder.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Choose from: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = po.status
        po.status = new_status
        po.save(update_fields=['status'])

        # Auto-stock sync on delivery
        if new_status == 'DELIVERED' and old_status != 'DELIVERED':
            self._sync_stock_on_delivery(po)

        return Response(PurchaseOrderSerializer(po).data)

    def _sync_stock_on_delivery(self, po):
        """When a PO is delivered, create Stock entries and update Inventory."""
        from modules.inventory.models import Stock, Inventory, InventoryMovement, Warehouse

        default_warehouse = Warehouse.objects.filter(is_default=True).first()
        if not default_warehouse:
            default_warehouse = Warehouse.objects.first()

        with transaction.atomic():
            for item in po.items.select_related('product'):
                product = item.product

                # Create a Stock entry for this procurement
                stock_entry = Stock.objects.create(
                    product_name=product.product_name,
                    supplier=po.supplier,
                    purchase_type='single',
                    total_quantity=item.quantity,
                    price_per_item=item.cost_price,
                )

                # Update product total_quantity
                if product.total_quantity is not None:
                    product.total_quantity += item.quantity
                else:
                    product.total_quantity = item.quantity
                product.save(update_fields=['total_quantity'])

                # Update or create Inventory record
                if default_warehouse:
                    inv, created = Inventory.objects.get_or_create(
                        product=product,
                        warehouse=default_warehouse,
                        defaults={'quantity_available': 0}
                    )
                    prev_qty = float(inv.quantity_available)
                    inv.quantity_available = prev_qty + item.quantity
                    inv.save()

                    # Log the movement
                    InventoryMovement.objects.create(
                        product=product,
                        warehouse=default_warehouse,
                        movement_type='Purchase',
                        quantity=item.quantity,
                        previous_quantity=prev_qty,
                        new_quantity=float(inv.quantity_available),
                        reference_id=po.tracking_id,
                        notes=f'Auto-stocked from PO {po.tracking_id}',
                        created_by=po.admin_user,
                    )
