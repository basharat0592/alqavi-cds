from rest_framework import serializers
from .models import Warehouse, Stock, StockMovement
from modules.supplier.serializers import SupplierSerializer


class WarehouseSerializer(serializers.ModelSerializer):
    stock_count = serializers.SerializerMethodField()
    area_name = serializers.CharField(source='area.name', read_only=True, default=None)

    class Meta:
        model = Warehouse
        fields = ['id', 'name', 'location', 'area', 'area_name', 'is_active',
                  'tenant', 'stock_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'area_name', 'tenant', 'stock_count', 'created_at', 'updated_at']

    def get_stock_count(self, obj):
        # 1. Count unique products linked to the catalog
        catalog_count = obj.stocks.filter(product__isnull=False).values('product').distinct().count()
        # 2. Count unique products added manually (by name)
        manual_count = obj.stocks.filter(product__isnull=True).values('product_name').distinct().count()
        return catalog_count + manual_count


class StockSerializer(serializers.ModelSerializer):
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    warehouse_name = serializers.ReadOnlyField(source='warehouse.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    sku = serializers.ReadOnlyField(source='product.sku')
    barcode = serializers.ReadOnlyField(source='product.barcode')
    description = serializers.ReadOnlyField(source='product.description')
    product_image = serializers.SerializerMethodField()

    weight = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            'id', 'product_name', 'product', 'category', 'category_name', 
            'supplier', 'supplier_name', 'warehouse', 'warehouse_name', 
            'purchase_type', 'cartons', 'items_per_carton', 'total_quantity', 
            'price_per_carton', 'price_per_item', 'sku', 'barcode', 'description', 'product_image', 'date',
            'weight', 'size', 'tenant', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at', 'supplier_name', 'warehouse_name', 'category_name']

    def get_weight(self, obj):
        if obj.weight: return obj.weight
        if obj.product and hasattr(obj.product, 'weight'): return obj.product.weight
        return ''

    def get_size(self, obj):
        if obj.size: return obj.size
        if obj.product and hasattr(obj.product, 'size'): return obj.product.size
        return ''

    def get_product_image(self, obj):
        from modules.products.models import SupplierProduct
        try:
            # Try matching by supplier product link first
            if hasattr(obj, 'supplier_product') and obj.supplier_product and obj.supplier_product.image:
                return obj.supplier_product.image.url
            # Fallback to name matching
            sp = SupplierProduct.objects.filter(name__iexact=obj.product_name).first()
            if sp and sp.image:
                return sp.image.url
        except:
            pass
        return None


class StockMovementSerializer(serializers.ModelSerializer):
    from_warehouse_name = serializers.ReadOnlyField(source='from_warehouse.name')
    to_warehouse_name = serializers.ReadOnlyField(source='to_warehouse.name')
    warehouse_name = serializers.ReadOnlyField(source='stock.warehouse.name')
    supplier_name = serializers.ReadOnlyField(source='stock.supplier.name')
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'stock', 'warehouse_name', 'supplier_name', 'movement_type', 
            'movement_type_display', 'quantity', 'from_warehouse', 
            'from_warehouse_name', 'to_warehouse', 'to_warehouse_name', 
            'date', 'description', 'created_at'
        ]
