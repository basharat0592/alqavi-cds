from django.db.models import Count
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Warehouse, Stock, StockMovement
from .serializers import WarehouseSerializer, StockSerializer, StockMovementSerializer
from core.permissions import HasModulePermission
from core.scoping import BranchScopedQuerysetMixin, scope_to_tenant, tenant_id_for


class WarehouseViewSet(BranchScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Warehouse.objects.all().order_by('name')
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    perm_module = 'inventory'
    # The model *is* the branch, so scope by its own id.
    branch_field = 'id'
    # Tenant (owning-Admin) isolation is the primary axis.
    tenant_field = 'tenant'

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

    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        primary_stock = self.get_object()
        destination_warehouse_id = request.data.get('destination_warehouse')
        quantity_to_transfer = request.data.get('quantity')
        transfer_date = request.data.get('date', primary_stock.date)

        if not destination_warehouse_id or not quantity_to_transfer:
            return Response({"error": "Destination warehouse and quantity are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            total_requested = int(quantity_to_transfer)
            if total_requested <= 0:
                return Response({"error": "Quantity must be greater than zero"}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError:
            return Response({"error": "Invalid quantity format"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            destination_warehouse = scope_to_tenant(
                request.user, Warehouse.objects.all()
            ).get(id=destination_warehouse_id)
        except Warehouse.DoesNotExist:
            return Response({"error": "Destination warehouse does not exist"}, status=status.HTTP_404_NOT_FOUND)

        # Find all matching stock records in the source warehouse to deplete from
        # matching the "Global Price-Point Truth" (Product + Price + Warehouse)
        matching_stocks = scope_to_tenant(request.user, Stock.objects.all()).filter(
            warehouse=primary_stock.warehouse,
            product=primary_stock.product,
            product_name=primary_stock.product_name,
            price_per_item=primary_stock.price_per_item,
            purchase_type=primary_stock.purchase_type,
            supplier=primary_stock.supplier,
            weight=primary_stock.weight,
            size=primary_stock.size
        ).order_by('-total_quantity')

        total_available = sum(s.total_quantity for s in matching_stocks)
        if total_requested > total_available:
            return Response({
                "error": f"Insufficient stock. Total available: {total_available}, Requested: {total_requested}"
            }, status=status.HTTP_400_BAD_REQUEST)

        remaining_to_transfer = total_requested
        
        with transaction.atomic():
            for stock in matching_stocks:
                if remaining_to_transfer <= 0:
                    break
                
                transfer_from_this = min(stock.total_quantity, remaining_to_transfer)
                if transfer_from_this <= 0:
                    continue
                
                # 1. Update source stock
                stock.total_quantity -= transfer_from_this
                if stock.purchase_type == 'carton' and stock.items_per_carton:
                    stock.cartons = stock.total_quantity // stock.items_per_carton
                stock.save()

                # Record Transfer Out
                StockMovement.objects.create(
                    stock=stock,
                    movement_type='TRANSFER_OUT',
                    quantity=-transfer_from_this,
                    from_warehouse=stock.warehouse,
                    to_warehouse=destination_warehouse,
                    date=transfer_date,
                    description=f"Transfer to {destination_warehouse.name}",
                    tenant_id=stock.tenant_id,
                )

                # 2. Add to destination stock (Merge if product/price matches)
                dest_stock = scope_to_tenant(request.user, Stock.objects.all()).filter(
                    warehouse=destination_warehouse,
                    product=stock.product,
                    product_name=stock.product_name,
                    price_per_item=stock.price_per_item,
                    purchase_type=stock.purchase_type,
                    supplier=stock.supplier,
                    category=stock.category,
                    weight=stock.weight,
                    size=stock.size
                ).first()

                if dest_stock:
                    dest_stock.total_quantity += transfer_from_this
                    if dest_stock.purchase_type == 'carton' and dest_stock.items_per_carton:
                        dest_stock.cartons = dest_stock.total_quantity // dest_stock.items_per_carton
                    dest_stock.save()
                    
                    StockMovement.objects.create(
                        stock=dest_stock,
                        movement_type='TRANSFER_IN',
                        quantity=transfer_from_this,
                        from_warehouse=stock.warehouse,
                        to_warehouse=destination_warehouse,
                        date=transfer_date,
                        description=f"Transfer from {stock.warehouse.name}",
                        tenant_id=dest_stock.tenant_id,
                    )
                else:
                    new_stock = Stock.objects.create(
                        product=stock.product,
                        product_name=stock.product_name,
                        category=stock.category,
                        supplier=stock.supplier,
                        warehouse=destination_warehouse,
                        purchase_type=stock.purchase_type,
                        total_quantity=transfer_from_this,
                        items_per_carton=stock.items_per_carton,
                        cartons=transfer_from_this // stock.items_per_carton if stock.purchase_type == 'carton' and stock.items_per_carton else None,
                        price_per_item=stock.price_per_item,
                        price_per_carton=stock.price_per_carton,
                        weight=stock.weight,
                        size=stock.size,
                        date=transfer_date,
                        created_by=stock.created_by,  # preserve the original owner
                        tenant_id=stock.tenant_id,  # keep within the same tenant
                    )
                    
                    StockMovement.objects.create(
                        stock=new_stock,
                        movement_type='TRANSFER_IN',
                        quantity=transfer_from_this,
                        from_warehouse=stock.warehouse,
                        to_warehouse=destination_warehouse,
                        date=transfer_date,
                        description=f"Transfer from {stock.warehouse.name}",
                        tenant_id=new_stock.tenant_id,
                    )
                
                remaining_to_transfer -= transfer_from_this
            
            return Response({"message": f"Successfully transferred {total_requested} units to {destination_warehouse.name}"})

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
